const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Real per-user auth (replacing the earlier shared-passcode Editor/Viewer
// gate, which controlled who could upload but never who could SEE what was
// uploaded). A JWT in an httpOnly cookie avoids needing a server-side
// session store; httpOnly keeps it out of reach of any XSS that might slip
// through (safer than the old editor token, which lived in localStorage).
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE_NAME = 'datastory_token';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: TOKEN_TTL_MS
};

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });
}

function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), COOKIE_OPTIONS);
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: COOKIE_OPTIONS.secure });
}

function getUserFromRequest(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { id: payload.sub, email: payload.email };
  } catch {
    return null; // expired/invalid/tampered — treat as logged out, not an error
  }
}

// Attaches req.user if a valid session cookie is present, never rejects —
// for routes that behave differently for logged-in vs anonymous visitors
// (e.g. GET /api/datasets still needs to serve public datasets to anyone).
function optionalAuth(req, res, next) {
  req.user = getUserFromRequest(req);
  next();
}

// Rejects with 401 unless a valid session cookie is present.
function requireAuth(req, res, next) {
  req.user = getUserFromRequest(req);
  if (!req.user) return res.status(401).json({ error: 'Login required' });
  next();
}

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie, optionalAuth, requireAuth };
