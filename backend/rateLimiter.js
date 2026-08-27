/**
 * Lightweight In-Memory IP Rate Limiter Middleware
 * Protects public authentication endpoints (/api/auth/signin, /api/auth/signup)
 * against automated bot requests without external dependencies.
 */

const requestCounts = new Map();

// Configuration: max 15 requests per 1-minute window per IP
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;

/**
 * Express Middleware for Auth Rate Limiting
 */
function authRateLimiter(req, res, next) {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();

  let record = requestCounts.get(clientIp);

  if (!record || now > record.resetTime) {
    record = {
      count: 1,
      resetTime: now + WINDOW_MS
    };
    requestCounts.set(clientIp, record);
    return next();
  }

  record.count += 1;

  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    console.warn(`[RATE LIMIT EXCEEDED] IP ${clientIp} blocked for exceeding ${MAX_REQUESTS_PER_WINDOW} requests/min.`);
    return res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please wait 1 minute before trying again.'
    });
  }

  return next();
}

// Periodically clean up old IPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  authRateLimiter
};
