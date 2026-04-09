const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP } = require('../services/otpService');
const db = require('../database');
const { verifyToken } = require('./auth');
const crypto = require('crypto');
const SECRET = process.env.JWT_SECRET || 'tritiya-dance-studio-secret-2024';
function makeToken(payload) {
  const encoded = Buffer.from(JSON.stringify({ ...payload, ts: Date.now() })).toString('base64');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex');
  return `${encoded}.${sig}`;
}

// Send OTP to student email
router.post('/send', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const student = db.prepare("SELECT * FROM students WHERE student_email=? AND active=1").get(email.trim().toLowerCase());
  if (!student) return res.status(404).json({ error: 'No student found with this email address' });

  const result = await sendOTP(email.trim().toLowerCase(), student.name);
  if (!result.success) return res.status(500).json({ error: 'Failed to send OTP. Check email settings.' });

  res.json({ ok: true, message: 'OTP sent to your email' });
});

// Verify OTP and return token
router.post('/verify', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  const student = db.prepare("SELECT * FROM students WHERE student_email=? AND active=1").get(email.trim().toLowerCase());
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const valid = verifyOTP(email.trim().toLowerCase(), otp.trim());
  if (!valid) return res.status(401).json({ error: 'Invalid or expired OTP' });

  const token = createToken({ role: 'student', student_id: student.id, name: student.name });
  res.json({ token, student: { id: student.id, name: student.name } });
});

module.exports = router;
