const axios = require('axios');

/**
 * SPAM GATE MODULE
 * 
 * Evaluates an incoming civic report payload BEFORE database insertion.
 * 
 * Rules:
 * Rule 1 — NO_PHOTO: image_url is null, undefined, empty, or whitespace-only
 * Rule 2 — EMPTY_DESCRIPTION: description is null, undefined, empty, or whitespace-only
 * Rule 3 — TOO_MANY_REPORTS_FROM_DEVICE: existing reports from device_id in past 10 minutes >= 3
 * 
 * @param {Object} reportPayload - Incoming report object to inspect
 * @param {Object} [options] - Configuration overrides for testing/environment
 * @returns {Promise<Object>} Object with { isSpam: boolean, reasons: string[] }
 */
async function runSpamGate(reportPayload, options = {}) {
  if (!reportPayload || typeof reportPayload !== 'object') {
    return {
      isSpam: true,
      reasons: ['INVALID_PAYLOAD']
    };
  }

  const reportId = reportPayload.id || 'NEW_REPORT';
  console.log(`[SPAM GATE] Inspecting report payload: ${reportId}`);

  const reasons = [];

  // RULE 1 — NO PHOTO
  const imageUrl = reportPayload.image_url || reportPayload.imageUrl;
  const isPhotoMissing = imageUrl === null || 
                         imageUrl === undefined || 
                         (typeof imageUrl === 'string' && imageUrl.trim() === '');
  if (isPhotoMissing) {
    reasons.push('NO_PHOTO');
  }

  // RULE 2 — EMPTY DESCRIPTION
  const description = reportPayload.description;
  const isDescMissing = description === null || 
                        description === undefined || 
                        (typeof description === 'string' && description.trim() === '');
  if (isDescMissing) {
    reasons.push('EMPTY_DESCRIPTION');
  }

  // RULE 3 — TOO MANY REPORTS FROM SAME DEVICE
  // Run cheap local checks first to avoid unnecessary DB calls.
  // If count of existing reports from this device in the last 10 mins >= 3, flag as spam.
  const deviceId = reportPayload.device_id || reportPayload.deviceId;
  const hasLocalSpam = reasons.length > 0;

  if (!hasLocalSpam && deviceId && typeof deviceId === 'string' && deviceId.trim() !== '') {
    try {
      const existingCount = await countRecentReportsFromDevice(deviceId, options);
      console.log(`[SPAM GATE] Device ${deviceId} has ${existingCount} reports in the last 10 minutes`);
      if (existingCount >= 3) {
        reasons.push('TOO_MANY_REPORTS_FROM_DEVICE');
      }
    } catch (err) {
      console.error(`[SPAM GATE] Supabase device query error: ${err.message}`);
      // Re-throw or handle error safely
      throw new Error(`Spam gate device lookup failed: ${err.message}`);
    }
  }

  const isSpam = reasons.length > 0;
  console.log(`[SPAM GATE] Result: isSpam=${isSpam}, reasons=[${reasons.join(', ')}]`);

  return {
    isSpam: isSpam,
    reasons: reasons
  };
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

module.exports = {
  runSpamGate,
  countRecentReportsFromDevice
};
