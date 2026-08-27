const axios = require('axios');

/**
 * Stage 1: SPAM DETECTION PIPELINE
 * 
 * Receives one incoming civic report object and determines whether it should be flagged as spam.
 * 
 * Spam Rules:
 * Rule 1 — NO_PHOTO: image_url is null, undefined, empty, or whitespace-only
 * Rule 2 — EMPTY_DESCRIPTION: description is null, undefined, empty, or whitespace-only
 * Rule 3 — TOO_MANY_REPORTS_FROM_DEVICE: > 3 reports from same device_id in past 10 minutes
 * 
 * Behavior when Spam Detected:
 * - Logs server-side debug diagnostics
 * - If report exists in database, DELETES row via Axios (DELETE /rest/v1/civic_reports?id=eq.<report_id>)
 * - Returns report: null, pipeline.continue: false, pipeline.action: 'deleted'
 * 
 * @param {Object} report - Incoming civic report object
 * @param {Object} [options] - Configuration overrides for testing
 * @returns {Promise<Object>} Shared pipeline contract object
 */
async function detectSpam(report, options = {}) {
  // Validate basic report input
  if (!report || typeof report !== 'object') {
    console.error('[SPAM] Invalid or missing report object provided');
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

  const reportId = report.id || 'UNKNOWN';
  console.log(`[SPAM] Checking report: ${reportId}`);

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
  // Perform recent-device lookup only if cheap local checks passed
  const deviceId = report.device_id;
  const hasLocalSpam = reasons.length > 0;
  
  if (!hasLocalSpam && deviceId && typeof deviceId === 'string' && deviceId.trim() !== '') {
    try {
      const recentReportCount = await checkDeviceReportFrequency(deviceId, options);
      if (recentReportCount > 3) {
        reasons.push('TOO_MANY_REPORTS_FROM_DEVICE');
      }
    } catch (err) {
      console.error(`[SPAM] Supabase device lookup error for ${reportId}: ${err.message}`);
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
  console.log(`[SPAM] Detected: ${isSpam}`);

  if (isSpam) {
    console.log(`[SPAM] Reasons: ${reasons.join(', ')}`);

    // If report row already exists in Supabase (or delete requested), DELETE exact row via Axios
    if ((options.deleteFromDb || options.isAlreadyInserted) && report.id) {
      console.log(`[SPAM] Deleting report: ${report.id}`);
      try {
        await deleteReportFromSupabase(report.id, options);
        console.log(`[SPAM] Delete successful`);
      } catch (err) {
        console.error(`[SPAM] Delete failed for ${report.id}: ${err.message}`);
        return {
          error: {
            message: `Unable to complete spam cleanup: ${err.message}`,
            code: 'SPAM_CLEANUP_FAILED'
          },
          report: null,
          spam: {
            isSpam: true,
            reasons: reasons
          },
          pipeline: {
            continue: false,
            nextStage: null,
            action: 'cleanup_failed'
          }
        };
      }
    }

    console.log(`[PIPELINE] Stopped`);

    return {
      report: null,
      spam: {
        isSpam: true,
        reasons: reasons
      },
      pipeline: {
        continue: false,
        nextStage: null,
        action: 'deleted'
      }
    };
  }

  console.log(`[PIPELINE] Continuing to categorisation`);

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
 * Helper: Delete specific report from Supabase PostgreSQL (civic_reports) via Axios REST API
 * DELETE /civic_reports?id=eq.<report_id>
 */
async function deleteReportFromSupabase(reportId, options = {}) {
  if (options.mockDelete) {
    return true;
  }
  if (options.mockDeleteError) {
    throw options.mockDeleteError;
  }

  const supabaseUrl = options.supabaseUrl || process.env.SUPABASE_URL;
  const supabaseKey = options.supabaseKey || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-supabase-project')) {
    return false;
  }

  const axiosClient = options.axiosInstance || axios;
  const url = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/civic_reports`;

  await axiosClient.delete(url, {
    params: {
      id: `eq.${reportId}`
    },
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });

  return true;
}

module.exports = {
  detectSpam,
  checkDeviceReportFrequency,
  deleteReportFromSupabase
};
