const crypto = require('crypto');

// Lightweight Editor/Viewer role gate — not a full account system, but a
// real server-enforced check (not just a client-side UI toggle a user could
// bypass by calling the API directly). The passcode gates who CAN become an
// editor; the token is what the client actually sends on every mutating
// request afterward. Regenerated on every server boot, so a redeploy/restart
// requires re-entering the passcode client-side.
const EDITOR_PASSCODE = process.env.EDITOR_PASSCODE || 'hackathon2026';
const EDITOR_TOKEN = crypto.randomBytes(24).toString('hex');

function verifyPasscode(passcode) {
  return typeof passcode === 'string' && passcode.length > 0 && passcode === EDITOR_PASSCODE;
}

function requireEditor(req, res, next) {
  const token = req.headers['x-editor-token'];
  if (token && token === EDITOR_TOKEN) return next();
  return res.status(403).json({ error: 'Editor access required for this action' });
}

module.exports = { EDITOR_TOKEN, verifyPasscode, requireEditor };
