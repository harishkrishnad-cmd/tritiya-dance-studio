const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/emailService');
const { hashPin } = require('./auth');

// ── Admin: create enrollment link ─────────────────────────────
router.post('/create-link', authMiddleware, adminOnly, (req, res) => {
  const { label } = req.body;
  const token = crypto.randomBytes(16).toString('hex');
  const r = db.prepare('INSERT INTO enrollment_links (token, label) VALUES (?, ?)').run(token, label || 'New Student Enrollment');
  const link = db.prepare('SELECT * FROM enrollment_links WHERE id=?').get(r.lastInsertRowid);
  res.json(link);
});

// ── Admin: list enrollment links ──────────────────────────────
router.get('/links', authMiddleware, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM enrollment_links ORDER BY created_at DESC').all());
});

// ── Admin: deactivate link ────────────────────────────────────
router.delete('/links/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('UPDATE enrollment_links SET active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── Public: get form metadata ─────────────────────────────────
router.get('/info/:token', (req, res) => {
  const link = db.prepare('SELECT * FROM enrollment_links WHERE token=? AND active=1').get(req.params.token);
  if (!link) return res.status(404).json({ error: 'Enrollment link is invalid or expired' });

  const settings = db.prepare('SELECT key, value FROM settings').all().reduce((a, { key, value }) => ({ ...a, [key]: value }), {});
  res.json({
    valid: true,
    label: link.label,
    school_name: settings.school_name || 'Tritiya Dance Studio',
    upi_qr_image: settings.upi_qr_image || '',
    upi_vpa: settings.upi_vpa || '',
    currency: settings.currency || '₹',
    razorpay_key_id: settings.razorpay_key_id || '',
    fee_amount: settings.fee_amount || '1000',
  });
});

// ── Public: submit enrollment form ────────────────────────────
router.post('/submit/:token', async (req, res) => {
  const link = db.prepare('SELECT * FROM enrollment_links WHERE token=? AND active=1').get(req.params.token);
  if (!link) return res.status(404).json({ error: 'Enrollment link is invalid or expired' });

  const { student_name, date_of_birth, level, parent_name, parent_email, parent_phone, address, notes, razorpay_paid } = req.body;
  if (!student_name || !parent_name || !parent_email) {
    return res.status(400).json({ error: 'Student name, parent name and email are required' });
  }
  // If paid via Razorpay, activate immediately — no teacher confirmation needed
  const autoActivate = razorpay_paid === true ? 1 : 0;

  // Generate parent credentials
  const username = (parent_name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '') + Math.floor(Math.random() * 900 + 100));
  const password = Math.random().toString(36).slice(-6).toUpperCase();
  const passwordHash = hashPin(password);

  // Generate student credentials
  const studentUsername = (student_name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '') + Math.floor(Math.random() * 900 + 100));
  const studentPassword = Math.random().toString(36).slice(-6).toUpperCase();
  const studentPasswordHash = hashPin(studentPassword);

  try {
    const result = db.prepare(`
      INSERT INTO students (name, date_of_birth, level, parent_name, parent_email, parent_phone, address, notes,
        parent_username, parent_password_hash, parent_pin,
        student_username, student_password_hash, student_pin,
        status, account_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(
      student_name.trim(), date_of_birth || null, level || 'Beginner',
      parent_name.trim(), parent_email.trim().toLowerCase(), parent_phone || null, address || null, notes || null,
      username, passwordHash, password,
      studentUsername, studentPasswordHash, studentPassword,
      autoActivate
    );

    const student = db.prepare('SELECT * FROM students WHERE id=?').get(result.lastInsertRowid);

    // Increment uses count
    db.prepare('UPDATE enrollment_links SET uses_count = uses_count + 1 WHERE id=?').run(link.id);

    // Send welcome email with both credentials
    sendWelcomeEmail(student, password, studentPassword).catch(console.error);

    res.json({
      success: true,
      auto_activated: autoActivate === 1,
      message: autoActivate === 1
        ? 'Enrollment complete! Your account is active — you can log in right away.'
        : 'Enrollment submitted! Your teacher will activate your account shortly.',
      parent_username: username,
    });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'An account with this email may already exist. Please contact the studio.' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
