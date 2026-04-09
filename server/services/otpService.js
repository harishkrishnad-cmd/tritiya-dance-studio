const db = require('../database');
const { sendEmail } = require('./emailService');

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOTP(email, name = '') {
  // Invalidate old OTPs for this email
  db.prepare("UPDATE otp_tokens SET used=1 WHERE email=? AND used=0").run(email);

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  db.prepare("INSERT INTO otp_tokens (email, otp, expires_at) VALUES (?,?,?)").run(email, otp, expiresAt);

  const settings = db.prepare('SELECT key,value FROM settings').all().reduce((a,r)=>({...a,[r.key]:r.value}),{});
  const schoolName = settings.school_name || 'Tritiya Dance Studio';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif}
.wrap{max-width:480px;margin:32px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.08)}
.head{background:#1c1c1e;padding:28px 32px;text-align:center}
.head h1{color:#fff;font-size:20px;font-weight:600}
.head p{color:rgba(255,255,255,.5);font-size:13px;margin-top:4px}
.body{padding:32px;text-align:center}
.otp{font-size:48px;font-weight:700;letter-spacing:12px;color:#1d1d1f;margin:24px 0;font-family:monospace}
.note{font-size:13px;color:#86868b;margin-top:16px}
</style></head><body>
<div class="wrap">
  <div class="head"><h1>🪷 ${schoolName}</h1><p>One-Time Password</p></div>
  <div class="body">
    <p style="font-size:16px;color:#1d1d1f">Hello${name ? ' ' + name : ''},</p>
    <p style="font-size:14px;color:#6e6e73;margin-top:8px">Your login code for the Student Portal is:</p>
    <div class="otp">${otp}</div>
    <p class="note">This code expires in <strong>10 minutes</strong>.<br>Do not share this code with anyone.</p>
  </div>
</div></body></html>`;

  return sendEmail(email, `${otp} — Your ${schoolName} Login Code`, html, null, 'otp');
}

function verifyOTP(email, otp) {
  const row = db.prepare(
    "SELECT * FROM otp_tokens WHERE email=? AND otp=? AND used=0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1"
  ).get(email, otp);

  if (!row) return false;
  db.prepare("UPDATE otp_tokens SET used=1 WHERE id=?").run(row.id);
  return true;
}

module.exports = { sendOTP, verifyOTP };
