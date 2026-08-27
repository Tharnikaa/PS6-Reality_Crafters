const { runSpamGate } = require('./spamGate');

/**
 * Stage 1: SPAM DETECTION / SPAM GATE WRAPPER
 * 
 * Provides backwards-compatible detectSpam interface wrapping runSpamGate.
 */
async function detectSpam(report, options = {}) {
  if (!report) {
    return {
      error: {
        message: 'Invalid or missing report payload',
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

  try {
    const gateResult = await runSpamGate(report, options);

    if (gateResult.isSpam) {
      return {
        report: null,
        spam: {
          isSpam: true,
          reasons: gateResult.reasons
        },
        pipeline: {
          continue: false,
          nextStage: null,
          action: options.mockDelete ? 'deleted' : 'rejected'
        }
      };
    }

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
  } catch (err) {
    return {
      error: {
        message: err.message,
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

module.exports = {
  detectSpam,
  runSpamGate
};
