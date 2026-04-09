const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
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
      if ((key === 'smtp_pass' || key === 'twilio_auth_token') && (value === '••••••••' || value === '')) continue;
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

// Ethereal quick-test — no credentials needed, proves email template renders
router.post('/test-ethereal', async (req, res) => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
      connectionTimeout: 10000,
      socketTimeout: 15000,
      greetingTimeout: 10000,
      tls: { rejectUnauthorized: false },
    });
    const settings = db.prepare('SELECT key, value FROM settings').all().reduce((a,{key,value})=>({...a,[key]:value}),{});
    const schoolName = settings.school_name || 'Tritiya Dance Studio';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1d1d1f}
.wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.08)}
.head{background:#1c1c1e;padding:28px 32px;text-align:center}.head h1{color:#fff;font-size:20px;font-weight:600}
.head p{color:rgba(255,255,255,.5);font-size:13px;margin-top:4px}.body{padding:32px}
.body p{font-size:15px;line-height:1.6;color:#1d1d1f;margin-bottom:14px}
.ok{background:#f0fff4;border:1px solid #34c759;border-radius:12px;padding:16px 20px;margin:16px 0;text-align:center}
.ok p{color:#1a7f37;font-size:16px;font-weight:600;margin:0}
.foot{background:#f5f5f7;padding:20px 32px;text-align:center;font-size:12px;color:#86868b;border-top:1px solid #e8e8ed}
</style></head><body><div class="wrap">
<div class="head"><h1>🪷 ${schoolName}</h1><p>Email Configuration Test</p></div>
<div class="body">
<p>Hello!</p>
<div class="ok"><p>✅ Email is working perfectly!</p></div>
<p>This test email was sent from <strong>${schoolName}</strong>'s management system. If you can see this, your email configuration is set up correctly.</p>
<p>You can now send welcome emails, payment reminders, and lesson plan notifications to parents.</p>
</div>
<div class="foot">${schoolName} · This is an automated test message.</div>
</div></body></html>`;
    const info = await transporter.sendMail({
      from: `"${schoolName}" <${testAccount.user}>`,
      to: testAccount.user,
      subject: `✅ Email Test — ${schoolName}`,
      html,
    });
    res.json({ success: true, previewUrl: nodemailer.getTestMessageUrl(info), messageId: info.messageId });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
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
