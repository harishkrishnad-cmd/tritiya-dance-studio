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

function generateCaptcha() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const id = crypto.randomBytes(12).toString('hex');
  captchaStore.set(id, { answer: String(a + b), expires: Date.now() + 10 * 60 * 1000 });
  return { captcha_id: id, question: `${a} + ${b}` };
}

function verifyCaptcha(id, answer) {
  const rec = captchaStore.get(id);
  if (!rec || Date.now() > rec.expires) return false;
  if (rec.answer !== String(answer).trim()) return false;
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

// GET /api/auth/captcha — generate a math CAPTCHA
router.get('/captcha', (req, res) => {
  res.json(generateCaptcha());
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
