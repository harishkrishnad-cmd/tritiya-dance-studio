const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendTestEmail } = require('../services/emailService');
const { sendWhatsApp } = require('../services/whatsappService');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = rows.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
  if (s.smtp_pass) s.smtp_pass = '••••••••';
  if (s.twilio_auth_token) s.twilio_auth_token = '••••••••';
  res.json(s);
});

router.post('/', (req, res) => {
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const saveAll = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) {
      if ((key === 'smtp_pass' || key === 'twilio_auth_token') && value === '••••••••') continue;
      upsert.run(key, value);
    }
  });
  saveAll(req.body);
  res.json({ success: true });
});

router.post('/test-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  res.json(await sendTestEmail(email));
});

router.post('/test-whatsapp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  const settings = db.prepare('SELECT key, value FROM settings').all().reduce((a, { key, value }) => ({ ...a, [key]: value }), {});
  const msg = `🪷 *${settings.school_name || 'Tritiya Dance Studio'}*\n\nThis is a test WhatsApp message. Your configuration is working correctly! ✅`;
  res.json(await sendWhatsApp(phone, msg));
});

router.get('/email-logs', (req, res) => {
  res.json(db.prepare(`SELECT el.*, s.name as student_name FROM email_logs el LEFT JOIN students s ON s.id=el.student_id ORDER BY el.sent_at DESC LIMIT 100`).all());
});

router.get('/whatsapp-logs', (req, res) => {
  res.json(db.prepare(`SELECT wl.*, s.name as student_name FROM whatsapp_logs wl LEFT JOIN students s ON s.id=wl.student_id ORDER BY wl.sent_at DESC LIMIT 100`).all());
});

module.exports = router;
