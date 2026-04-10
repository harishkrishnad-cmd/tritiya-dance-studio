const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database');

// ── In-memory rate limiter ────────────────────────────────────
const loginAttempts = new Map();
const RATE_LIMIT = 5;       // max attempts
const RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || now > rec.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  rec.count++;
  if (rec.count > RATE_LIMIT) return true;
  return false;
}
function resetRateLimit(ip) { loginAttempts.delete(ip); }
// Cleanup old entries every 30 min
setInterval(() => { const now = Date.now(); for (const [k, v] of loginAttempts) if (now > v.resetAt) loginAttempts.delete(k); }, 30 * 60 * 1000);

// ── In-memory CAPTCHA store ───────────────────────────────────
const captchaStore = new Map();
setInterval(() => { const now = Date.now(); for (const [k, v] of captchaStore) if (now > v.expires) captchaStore.delete(k); }, 60 * 1000);

function generateImageCaptcha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text = '';
  for (let i = 0; i < 5; i++) text += chars[Math.floor(Math.random() * chars.length)];
  const id = crypto.randomBytes(12).toString('hex');
  captchaStore.set(id, { answer: text, expires: Date.now() + 10 * 60 * 1000 });

  const width = 180, height = 60;
  const lines = [];
  for (let i = 0; i < 7; i++) {
    const x1 = Math.floor(Math.random() * width), y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width), y2 = Math.floor(Math.random() * height);
    const r = Math.floor(Math.random() * 180), g = Math.floor(Math.random() * 180), b = Math.floor(Math.random() * 180);
    lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgb(${r},${g},${b})" stroke-width="1.5" opacity="0.45"/>`);
  }
  const dots = [];
  for (let i = 0; i < 40; i++) {
    const cx = Math.floor(Math.random() * width), cy = Math.floor(Math.random() * height);
    dots.push(`<circle cx="${cx}" cy="${cy}" r="1.2" fill="rgba(0,0,0,0.12)"/>`);
  }
  const palette = ['#1a237e','#4a148c','#b71c1c','#004d40','#e65100','#0d47a1','#1b5e20','#311b92'];
  const letters = text.split('').map((c, i) => {
    const x = 16 + i * 30;
    const y = 38 + (Math.random() * 10 - 5);
    const angle = Math.floor(Math.random() * 24 - 12);
    const size = 24 + Math.floor(Math.random() * 8);
    const color = palette[Math.floor(Math.random() * palette.length)];
    return `<text x="${x}" y="${y}" transform="rotate(${angle},${x},${y})" font-size="${size}" font-family="Arial,sans-serif" font-weight="bold" fill="${color}">${c}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="8" fill="#f0f0f0"/>${lines.join('')}${dots.join('')}${letters}</svg>`;
  return { captcha_id: id, image_url: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` };
}

function verifyCaptcha(id, answer) {
  const rec = captchaStore.get(id);
  if (!rec || Date.now() > rec.expires) return false;
  if (rec.answer.toUpperCase() !== String(answer).trim().toUpperCase()) return false;
  captchaStore.delete(id); // one-time use
  return true;
}

const ADMIN_USER = 'admin';
const ADMIN_PASS_DEFAULT = 'rishujanu';
const SECRET = process.env.JWT_SECRET || 'tritiya-dance-studio-secret-2024';

function getAdminPasswordHash() {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key='admin_password_hash'").get();
    return row ? row.value : null;
  } catch { return null; }
}

function makeToken(payload) {
  const encoded = Buffer.from(JSON.stringify({ ...payload, ts: Date.now() })).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex');
  return `${encoded}.${sig}`;
}

function verifyToken(token) {
  try {
    const [encoded, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(encoded, 'base64').toString());
  } catch { return null; }
}

function hashPin(pin) {
  return crypto.createHash('sha256').update(pin + SECRET).digest('hex');
}

// GET /api/auth/captcha — generate an image CAPTCHA
router.get('/captcha', (req, res) => {
  res.json(generateImageCaptcha());
});

// Admin login
router.post('/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many failed attempts. Please wait 15 minutes before trying again.' });

  const { username, password, captcha_id, captcha_answer } = req.body;
  if (!verifyCaptcha(captcha_id, captcha_answer)) return res.status(400).json({ error: 'Incorrect CAPTCHA answer. Please try again.', captcha_error: true });

  if (username !== ADMIN_USER) return res.status(401).json({ error: 'Invalid user ID or password' });

  const storedHash = getAdminPasswordHash();
  const valid = storedHash
    ? hashPin(password) === storedHash
    : password === ADMIN_PASS_DEFAULT;

  if (!valid) return res.status(401).json({ error: 'Invalid user ID or password' });
  resetRateLimit(ip);
  res.json({ token: makeToken({ username, role: 'admin' }), username, role: 'admin' });
});

// Parent login
router.post('/parent-login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many failed attempts. Please wait 15 minutes before trying again.' });

  const { username, password, captcha_id, captcha_answer } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!verifyCaptcha(captcha_id, captcha_answer)) return res.status(400).json({ error: 'Incorrect CAPTCHA answer. Please try again.', captcha_error: true });

  const student = db.prepare('SELECT * FROM students WHERE parent_username = ? AND active = 1').get(username.trim());
  if (!student) return res.status(401).json({ error: 'Invalid credentials' });

  const hashed = hashPin(password);
  if (student.parent_password_hash !== hashed) return res.status(401).json({ error: 'Invalid credentials' });

  if (student.account_active === 0) {
    return res.status(403).json({ error: 'Account not yet activated. Payment not yet confirmed. Please contact your teacher.', not_activated: true });
  }

  resetRateLimit(ip);
  const token = makeToken({ username, role: 'parent', student_id: student.id });
  res.json({ token, username, role: 'parent', student_id: student.id, student_name: student.name });
});

// Student login (username + password)
router.post('/student-login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many failed attempts. Please wait 15 minutes before trying again.' });

  const { username, password, captcha_id, captcha_answer } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!verifyCaptcha(captcha_id, captcha_answer)) return res.status(400).json({ error: 'Incorrect CAPTCHA answer. Please try again.', captcha_error: true });

  const student = db.prepare('SELECT * FROM students WHERE student_username = ? AND active = 1').get(username.trim().toLowerCase());
  if (!student) return res.status(401).json({ error: 'Invalid username or password' });

  const hashed = hashPin(password.trim());
  if (student.student_password_hash !== hashed) return res.status(401).json({ error: 'Invalid username or password' });

  if (student.account_active === 0) {
    return res.status(403).json({ error: 'Account not yet activated. Payment not yet confirmed. Please contact your teacher.', not_activated: true });
  }

  resetRateLimit(ip);
  const token = makeToken({ role: 'student', student_id: student.id, name: student.name });
  res.json({ token, username: student.student_username, role: 'student', student_id: student.id, student_name: student.name });
});

router.get('/verify', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const data = token ? verifyToken(token) : null;
  if (!data) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ ok: true, role: data.role, student_id: data.student_id });
});

module.exports = { router, verifyToken, hashPin };
