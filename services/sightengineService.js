const axios = require('axios');
const FormData = require('form-data');

/**
 * Sightengine Image Moderation Service
 * 
 * Communicates directly with Sightengine API to inspect uploaded images
 * for inappropriate or malicious content (nudity, violence, offensive material, gore).
 * 
 * Credentials configured via process.env.SIGHTENGINE_API_USER and process.env.SIGHTENGINE_API_SECRET.
 * Credentials are NEVER exposed to the frontend or returned in API responses.
 */
async function checkImageModeration(imageBufferOrUrl, options = {}) {
  // Testing mock override
  if (options.mockSightengineResult !== undefined) {
    return options.mockSightengineResult;
  }

  const apiUser = options.apiUser || process.env.SIGHTENGINE_API_USER;
  const apiSecret = options.apiSecret || process.env.SIGHTENGINE_API_SECRET;

  // If credentials are not set in environment, log warning and return safe default
  if (!apiUser || !apiSecret || apiUser.trim() === '' || apiSecret.trim() === '') {
    return {
      isAcceptable: true,
      reason: null,
      details: 'Sightengine credentials not configured in environment.'
    };
  }

  const axiosClient = options.axiosInstance || axios;
  const endpoint = 'https://api.sightengine.com/1.0/check.json';

  try {
    let response;

    if (typeof imageBufferOrUrl === 'string' && imageBufferOrUrl.startsWith('http')) {
      // Remote public image URL submission
      response = await axiosClient.get(endpoint, {
        params: {
          url: imageBufferOrUrl,
          models: 'nudity-2.0,wad,offensive,text-content,gore',
          api_user: apiUser,
          api_secret: apiSecret
        }
      });
    } else if (Buffer.isBuffer(imageBufferOrUrl)) {
      // Direct raw image buffer upload submission
      const form = new FormData();
      form.append('media', imageBufferOrUrl, { filename: 'report_image.jpg' });
      form.append('models', 'nudity-2.0,wad,offensive,text-content,gore');
      form.append('api_user', apiUser);
      form.append('api_secret', apiSecret);

      response = await axiosClient.post(endpoint, form, {
        headers: form.getHeaders()
      });
    } else {
      return {
        isAcceptable: true,
        reason: null,
        details: 'No valid image buffer or URL provided for moderation.'
      };
    }

    const data = response.data || {};

    if (data.status !== 'success') {
      console.warn(`[SIGHTENGINE] API status warning: ${data.error ? data.error.message : 'Unknown status'}`);
      return { isAcceptable: true, reason: null };
    }

    // Evaluate moderation thresholds
    const nudityScore = data.nudity ? (data.nudity.sexual_activity || 0) + (data.nudity.sexual_display || 0) : 0;
    const weaponScore = data.weapon || 0;
    const alcoholScore = data.alcohol || 0;
    const drugsScore = data.drugs || 0;
    const offensiveScore = data.offensive ? data.offensive.prob : 0;
    const goreScore = data.gore ? data.gore.prob : 0;

    const isFlagged = nudityScore > 0.7 || weaponScore > 0.8 || offensiveScore > 0.8 || goreScore > 0.8;

    if (isFlagged) {
      return {
        isAcceptable: false,
        reason: 'SIGHTENGINE_MODERATION',
        details: { nudityScore, weaponScore, offensiveScore, goreScore }
      };
    }

    return {
      isAcceptable: true,
      reason: null,
      details: { nudityScore, weaponScore, offensiveScore, goreScore }
    };

  } catch (err) {
    console.error(`[SIGHTENGINE] Error checking image moderation: ${err.message}`);
    // Safe fallback on external API failure
    return {
      isAcceptable: true,
      reason: null,
      details: `API Error: ${err.message}`
    };
  }
}

module.exports = {
  checkImageModeration
};
