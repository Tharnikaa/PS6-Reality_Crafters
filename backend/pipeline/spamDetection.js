const axios = require('axios');

/**
 * Stage 1: SPAM DETECTION PIPELINE
 * 
 * Receives one incoming civic report object and determines whether it should be flagged as spam.
 * 
 * Rule 1 — NO_PHOTO: image_url is null, undefined, empty, or whitespace-only
 * Rule 2 — EMPTY_DESCRIPTION: description is null, undefined, empty, or whitespace-only
 * Rule 3 — TOO_MANY_REPORTS_FROM_DEVICE: > 3 reports from same device_id in past 10 minutes
 * 
 * If spam is detected:
 * - Marks status as "Spam"
 * - Updates/Stores report in Supabase with status "Spam" via Axios REST API
 * - Returns pipeline contract with continue: false, nextStage: null
 * 
 * @param {Object} report - Incoming civic report object
 * @param {Object} [options] - Configuration overrides for testing
 * @returns {Promise<Object>} Shared pipeline contract object
 */
async function detectSpam(report, options = {}) {
  // Error handling: validate basic report input
  if (!report || typeof report !== 'object') {
    return {
      error: {
        message: 'Invalid or missing report object',
        code: 'INVALID_REPORT'
      },
      report: null,
      spam: {
        isSpam: null,
        reasons: []
      },
      pipeline: {
        continue: false,
        nextStage: null
      }
    };
  }

  const reasons = [];

  // RULE 1 — NO PHOTO
  const imageUrl = report.image_url;
  const isPhotoMissing = imageUrl === null || 
                         imageUrl === undefined || 
                         (typeof imageUrl === 'string' && imageUrl.trim() === '');
  if (isPhotoMissing) {
    reasons.push('NO_PHOTO');
  }

  // RULE 2 — EMPTY DESCRIPTION
  const description = report.description;
  const isDescMissing = description === null || 
                        description === undefined || 
                        (typeof description === 'string' && description.trim() === '');
  if (isDescMissing) {
    reasons.push('EMPTY_DESCRIPTION');
  }

  // RULE 3 — TOO MANY REPORTS FROM THE SAME DEVICE
  // Only query Supabase recent-device lookup if local checks pass (cheap local checks first)
  const deviceId = report.device_id;
  const hasLocalSpam = reasons.length > 0;
  
  if (!hasLocalSpam && deviceId && typeof deviceId === 'string' && deviceId.trim() !== '') {
    try {
      const recentReportCount = await checkDeviceReportFrequency(deviceId, options);
      if (recentReportCount > 3) {
        reasons.push('TOO_MANY_REPORTS_FROM_DEVICE');
      }
    } catch (err) {
      // CASE 6: Supabase device lookup failure -> return explicit error structure
      return {
        error: {
          message: `Supabase device lookup failed: ${err.message}`,
          code: 'SUPABASE_ERROR'
        },
        report: report,
        spam: {
          isSpam: null,
          reasons: []
        },
        pipeline: {
          continue: false,
          nextStage: null
        }
      };
    }
  }

  const isSpam = reasons.length > 0;

  if (isSpam) {
    // Clone report object and set status to "Spam"
    const updatedReport = {
      ...report,
      status: 'Spam'
    };

    // Update report status in Supabase via Axios REST API if target ID exists
    if (report.id) {
      await updateReportStatusInSupabase(report.id, 'Spam', options).catch(err => {
        console.warn(`[SpamDetection] Warning: Failed to update status in Supabase: ${err.message}`);
      });
    }

    return {
      report: updatedReport,
      spam: {
        isSpam: true,
        reasons: reasons
      },
      pipeline: {
        continue: false,
        nextStage: null
      }
    };
  }

  // Valid report -> proceed to categorisation
  return {
    report: report,
    spam: {
      isSpam: false,
      reasons: []
    },
    pipeline: {
      continue: true,
      nextStage: 'categorisation'
    }
  };
}

/**
 * Helper: Query Supabase REST API via Axios for reports from device_id in past 10 minutes
 */
async function checkDeviceReportFrequency(deviceId, options = {}) {
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

/**
 * Helper: Update report status in Supabase REST API via Axios
 * PATCH /civic_reports?id=eq.<report_id>
 */
async function updateReportStatusInSupabase(reportId, newStatus, options = {}) {
  if (options.mockUpdate) {
    return true;
  }

  const supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
  const supabaseKey = options.supabaseKey || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-supabase-project')) {
    return false;
  }

  const axiosClient = options.axiosInstance || axios;
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/civic_reports`;

  await axiosClient.patch(url, { status: newStatus }, {
    params: {
      id: `eq.${reportId}`
    },
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    }
  });

  return true;
}

module.exports = {
  detectSpam,
  checkDeviceReportFrequency,
  updateReportStatusInSupabase
};
