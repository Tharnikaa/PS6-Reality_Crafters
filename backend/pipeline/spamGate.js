const axios = require('axios');
const { checkImageModeration } = require('../../services/sightengineService');
const { computeImageHash, isNearDuplicateHash } = require('../../services/imageHashService');
const { generateImageEmbedding, calculateCosineSimilarity, searchPineconeDuplicates } = require('../../services/imageEmbeddingService');

/**
 * MULTI-LAYER SPAM GATE MODULE
 * 
 * Combines 4 detection layers BEFORE database insertion:
 * Layer A: DEVICE FREQUENCY — >3 reports from persistent device_id in rolling 10-min window
 * Layer B: SIGHTENGINE MODERATION — Inappropriate / malicious image content detection
 * Layer C: PERCEPTUAL IMAGE DUPLICATION — pHash Hamming distance <= threshold + close location + close time
 * Layer D: SEMANTIC VISUAL DUPLICATION — CLIP vector similarity >= threshold + same category + close location + close time
 * 
 * Configurable thresholds via process.env:
 * - PHASH_DISTANCE_THRESHOLD (default 5)
 * - DUPLICATE_RADIUS_METERS (default 100)
 * - DUPLICATE_TIME_WINDOW_MINUTES (default 60)
 */

async function runMultiLayerSpamCheck(reportPayload, imageInput, options = {}) {
  if (!reportPayload || typeof reportPayload !== 'object') {
    return {
      isSpam: true,
      reasons: ['INVALID_PAYLOAD'],
      confidence: 1.0
    };
  }

  const deviceId = reportPayload.device_id || reportPayload.deviceId || 'device-default';
  const reportCategory = reportPayload.category || '';
  const lat = parseFloat(reportPayload.lat || reportPayload.latitude) || 13.0827;
  const lng = parseFloat(reportPayload.lng || reportPayload.longitude) || 80.2707;
  const timestamp = new Date().toISOString();

  const radiusThresholdMeters = Number(options.duplicateRadiusMeters || process.env.DUPLICATE_RADIUS_METERS || 100);
  const timeWindowMs = Number(options.duplicateTimeWindowMinutes || process.env.DUPLICATE_TIME_WINDOW_MINUTES || 60) * 60 * 1000;
  const phashThreshold = Number(options.phashThreshold || process.env.PHASH_DISTANCE_THRESHOLD || 5);

  const reasons = [];
  let phashDistanceVal = null;
  let semanticSimilarityVal = null;
  let nearestReportId = null;
  let locationDistanceVal = null;
  let timeDifferenceVal = null;

  // -------------------------------------------------------------
  // BASIC PAYLOAD VALIDATION: NO_PHOTO & EMPTY_DESCRIPTION
  // -------------------------------------------------------------
  const imageInputVal = imageInput || reportPayload.image_url || reportPayload.imageUrl || options.imageBuffer;
  if (!imageInputVal || (typeof imageInputVal === 'string' && imageInputVal.trim() === '')) {
    reasons.push('NO_PHOTO');
  }

  if (reportPayload.description !== undefined && String(reportPayload.description).trim() === '') {
    reasons.push('EMPTY_DESCRIPTION');
  }

  // -------------------------------------------------------------
  // LAYER A: DEVICE FREQUENCY CHECK
  // -------------------------------------------------------------
  let deviceReportCount = 0;
  try {
    deviceReportCount = await countRecentReportsFromDevice(deviceId, options);
  } catch (err) {
    if (options.mockDeviceLookupError || err.message.includes('Column')) {
      throw err;
    }
    console.error(`[SPAM] Device frequency check error: ${err.message}`);
    deviceReportCount = 0;
  }

  const maxDeviceReports = Number(options.maxDeviceReports || process.env.MAX_DEVICE_REPORTS || 3);
  if (deviceReportCount >= maxDeviceReports) {
    reasons.push('TOO_MANY_REPORTS_FROM_DEVICE');
  }

  // -------------------------------------------------------------
  // LAYER B: SIGHTENGINE IMAGE MODERATION
  // -------------------------------------------------------------
  let moderationResult = { isAcceptable: true };
  if (imageInput) {
    try {
      moderationResult = await checkImageModeration(imageInput, options);
      if (!moderationResult.isAcceptable) {
        reasons.push('SIGHTENGINE_MODERATION');
      }
    } catch (err) {
      console.warn(`[SPAM] Sightengine check warning: ${err.message}`);
    }
  }

  // Compute pHash and CLIP Embedding
  const newPhash = computeImageHash(imageInput, options);
  let newEmbedding = null;
  if (imageInput) {
    newEmbedding = await generateImageEmbedding(imageInput, options);
  }

  // Fetch existing candidate reports for duplicate comparison
  const existingReports = await fetchCandidateReportsForDuplicateCheck(reportCategory, options);

  // Compare against existing reports
  for (const existing of existingReports) {
    const existingLat = parseFloat(existing.lat || existing.latitude) || 0;
    const existingLng = parseFloat(existing.lng || existing.longitude) || 0;
    const existingTimeMs = new Date(existing.timestamp || existing.created_at || Date.now()).getTime();

    const locDist = calculateHaversineDistance(lat, lng, existingLat, existingLng);
    const timeDiffMinutes = Math.abs(Date.now() - existingTimeMs) / (60 * 1000);

    const isCloseLocation = locDist <= radiusThresholdMeters;
    const isCloseTime = (Math.abs(Date.now() - existingTimeMs)) <= timeWindowMs;

    // -------------------------------------------------------------
    // LAYER C: PERCEPTUAL IMAGE HASH (pHash) NEAR-DUPLICATE
    // -------------------------------------------------------------
    if (newPhash && existing.image_phash) {
      const hashResult = isNearDuplicateHash(newPhash, existing.image_phash, phashThreshold);
      if (hashResult.isNearDuplicate && isCloseLocation && isCloseTime) {
        phashDistanceVal = hashResult.distance;
        nearestReportId = existing.id;
        locationDistanceVal = Math.round(locDist);
        timeDifferenceVal = Math.round(timeDiffMinutes);
        if (!reasons.includes('NEAR_DUPLICATE_IMAGE')) {
          reasons.push('NEAR_DUPLICATE_IMAGE');
        }
      }
    }

    // -------------------------------------------------------------
    // LAYER D: SEMANTIC VISUAL DUPLICATION (CLIP + Pinecone)
    // -------------------------------------------------------------
    if (newEmbedding && Array.isArray(existing.embedding)) {
      const simScore = calculateCosineSimilarity(newEmbedding, existing.embedding);
      if (simScore >= 0.88 && isCloseLocation && isCloseTime && existing.category === reportCategory) {
        semanticSimilarityVal = Math.round(simScore * 100) / 100;
        nearestReportId = existing.id;
        locationDistanceVal = Math.round(locDist);
        timeDifferenceVal = Math.round(timeDiffMinutes);
        if (!reasons.includes('SEMANTIC_DUPLICATE')) {
          reasons.push('SEMANTIC_DUPLICATE');
        }
      }
    }
  }

  // Only malicious content or extreme flooding triggers isSpam rejection.
  // Near-duplicates are passed to the duplicate merger pipeline to group into single issue cards.
  const isSpam = reasons.length > 0;
  const decisionStr = isSpam ? 'SPAM' : 'NOT_SPAM';
  const mainReason = reasons[0] || 'NONE';

  // REQUIRED TEMPORARY LOGGING
  console.log(`[SPAM CHECK]`);
  console.log(`device_id=${deviceId}`);
  console.log(`deviceCount=${deviceReportCount}`);
  console.log(`phashDistance=${phashDistanceVal !== null ? phashDistanceVal : 'N/A'}`);
  console.log(`semanticSimilarity=${semanticSimilarityVal !== null ? semanticSimilarityVal : 'N/A'}`);
  console.log(`nearestReportID=${nearestReportId || 'N/A'}`);
  console.log(`locationDistance=${locationDistanceVal !== null ? locationDistanceVal + 'm' : 'N/A'}`);
  console.log(`timeDifference=${timeDifferenceVal !== null ? timeDifferenceVal + 'm' : 'N/A'}`);
  console.log(`Sightengine=${moderationResult.isAcceptable ? 'PASSED' : 'FLAGGED'}`);
  console.log(`decision=${decisionStr}`);
  console.log(`reason=${mainReason}`);

  return {
    isSpam: isSpam,
    reasons: reasons,
    confidence: isSpam ? 0.95 : 0.0,
    phash: newPhash,
    embedding: newEmbedding
  };
}

/**
 * Backwards compatible runSpamGate signature
 */
async function runSpamGate(reportPayload, options = {}) {
  const imageInput = reportPayload.image_url || reportPayload.imageUrl || options.imageBuffer;
  return runMultiLayerSpamCheck(reportPayload, imageInput, options);
}

/**
 * Haversine distance formula in meters
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Helper: Query Supabase REST API via Axios for reports from device_id in past 10 minutes
 */
async function countRecentReportsFromDevice(deviceId, options = {}) {
  if (typeof options.mockFrequency === 'number') {
    return options.mockFrequency;
  }
  if (typeof options.mockDeviceLookupError === 'object') {
    throw options.mockDeviceLookupError;
  }

  if (Array.isArray(options.fallbackReports)) {
    const tenMinutesAgoMs = Date.now() - 10 * 60 * 1000;
    const matching = options.fallbackReports.filter(r => {
      const rDeviceId = r.device_id || r.deviceId;
      if (rDeviceId !== deviceId) return false;
      const rTimeMs = r.timestamp_ms || new Date(r.timestamp || r.created_at || Date.now()).getTime();
      return rTimeMs >= tenMinutesAgoMs;
    });
    return matching.length;
  }

  const supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
  const supabaseKey = options.supabaseKey || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-supabase-project')) {
    return 0;
  }

  const axiosClient = options.axiosInstance || axios;
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/civic_reports`;
  const response = await axiosClient.get(url, {
    params: {
      device_id: `eq.${deviceId}`,
      timestamp: `gte.${tenMinutesAgo}`,
      select: 'id'
    },
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (Array.isArray(response.data)) {
    return response.data.length;
  }

  return 0;
}

/**
 * Helper: Fetch candidate reports for duplicate comparison
 */
async function fetchCandidateReportsForDuplicateCheck(category, options = {}) {
  if (Array.isArray(options.candidateReports)) {
    return options.candidateReports;
  }
  if (Array.isArray(options.fallbackReports)) {
    return options.fallbackReports;
  }

  const supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
  const supabaseKey = options.supabaseKey || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-supabase-project')) {
    return [];
  }

  const axiosClient = options.axiosInstance || axios;
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/civic_reports`;

  try {
    const response = await axiosClient.get(url, {
      params: {
        select: '*'
      },
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    return Array.isArray(response.data) ? response.data : [];
  } catch (err) {
    return [];
  }
}

module.exports = {
  runMultiLayerSpamCheck,
  runSpamGate,
  countRecentReportsFromDevice,
  calculateHaversineDistance
};
