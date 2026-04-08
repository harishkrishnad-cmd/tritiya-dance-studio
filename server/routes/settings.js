const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendTestEmail } = require('../services/emailService');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = rows.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
  // Don't expose smtp_pass in full
  if (settings.smtp_pass) settings.smtp_pass = '••••••••';
  res.json(settings);
});

router.post('/', (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const saveAll = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) {
      // Don't overwrite smtp_pass with masked value
      if (key === 'smtp_pass' && value === '••••••••') continue;
      upsert.run(key, value);
    }
  });
  saveAll(req.body);
  res.json({ success: true });
});

router.post('/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address required' });
  const result = await sendTestEmail(email);
  res.json(result);
});

// Email logs
router.get('/email-logs', (req, res) => {
  const logs = db.prepare(`
    SELECT el.*, s.name as student_name FROM email_logs el
    LEFT JOIN students s ON s.id = el.student_id
    ORDER BY el.sent_at DESC LIMIT 100
  `).all();
  res.json(logs);
});

module.exports = router;
