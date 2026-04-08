const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'rishujanu';
const SECRET = process.env.JWT_SECRET || 'tritiya-dance-studio-secret-2024';

// Simple signed token: base64(payload).signature
function makeToken(username) {
  const payload = Buffer.from(JSON.stringify({ username, ts: Date.now() })).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch { return null; }
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ token: makeToken(username), username });
  }
  res.status(401).json({ error: 'Invalid user ID or password' });
});

router.get('/verify', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token || !verifyToken(token)) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ ok: true });
});

module.exports = { router, verifyToken };
