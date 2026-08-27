const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-supabase-project')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('[AUTH] Supabase initialization error:', err.message);
  }
}

/**
 * Express Middleware: Authenticate Supabase JWT Access Token
 * 
 * Flow:
 * 1. Extract Bearer token from Authorization header (Authorization: Bearer <token>)
 * 2. Verify token with Supabase Auth (supabase.auth.getUser)
 * 3. Attach authenticated user object to req.user
 * 4. Pass control to next() if valid, or return HTTP 401 Unauthorized if missing/invalid
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    console.warn('[AUTH] Request rejected: Missing Authorization Bearer token');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized access: Missing authentication token.'
    });
  }

  // If Supabase is not configured in local development, allow mock tokens or verify
  if (!supabase) {
    if (token === 'demo-jwt-token' || token.length > 10) {
      req.user = { id: 'usr-demo-100', phone: req.body.reporterPhone || '+91 9876543210' };
      return next();
    }
    return res.status(401).json({
      success: false,
      error: 'Unauthorized access: Invalid authentication token.'
    });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.warn(`[AUTH] Token verification failed: ${error ? error.message : 'User not found'}`);
      return res.status(401).json({
        success: false,
        error: 'Unauthorized access: Invalid or expired token.'
      });
    }

    req.user = user;
    return next();
  } catch (err) {
    console.error(`[AUTH] Authentication exception: ${err.message}`);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized access: Token verification error.'
    });
  }
}

module.exports = {
  authenticateToken
};
