const express = require('express');
const router = express.Router();
const { verifyPasscode, EDITOR_TOKEN } = require('../auth');

// POST /api/auth/login - exchange the editor passcode for a session token
router.post('/login', (req, res) => {
  const { passcode } = req.body || {};

  if (verifyPasscode(passcode)) {
    return res.json({ token: EDITOR_TOKEN });
  }

  return res.status(401).json({ error: 'Incorrect passcode' });
});

module.exports = router;
