const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const { setAuthCookie, clearAuthCookie, requireAuth } = require('../auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toPublicUser(row) {
  return { id: row.id, email: row.email, displayName: row.display_name };
}

router.post('/signup', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};

    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(String(password), 10);
    const finalDisplayName = (displayName && String(displayName).trim()) || normalizedEmail.split('@')[0];
    const createdAt = new Date().toISOString();

    db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, normalizedEmail, passwordHash, finalDisplayName, createdAt);

    const user = { id, email: normalizedEmail, displayName: finalDisplayName };
    setAuthCookie(res, user);
    res.status(201).json({ user });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
    // Same generic message whether the email doesn't exist or the password is
    // wrong — doesn't reveal which emails have accounts.
    if (!row || !(await bcrypt.compare(String(password), row.password_hash))) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    setAuthCookie(res, { id: row.id, email: row.email });
    res.json({ user: toPublicUser(row) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, (req, res) => {
  const row = db.prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(401).json({ error: 'Login required' });
  res.json({ user: toPublicUser(row) });
});

module.exports = router;
