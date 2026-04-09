const nodemailer = require('nodemailer');
const db = require('../database');

function getSettings() {
  return db.prepare('SELECT key, value FROM settings').all()
    .reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
}

function createTransporter(settings) {
  const port = parseInt(settings.smtp_port) || 587;
  const secure = settings.smtp_secure === 'true';
  return nodemailer.createTransport({
    host: settings.smtp_host || 'smtp.gmail.com',
    port,
    secure,
    auth: { user: settings.smtp_user, pass: settings.smtp_pass },
    tls: { rejectUnauthorized: false },
    ...(port === 587 && !secure ? { requireTLS: true } : {}),
  });
}

function logEmail(studentId, type, subject, recipientEmail, status, errorMessage = null) {
  db.prepare(`INSERT INTO email_logs (student_id, email_type, subject, recipient_email, status, error_message) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(studentId, type, subject, recipientEmail, status, errorMessage);
}

async function sendEmail(to, subject, html, studentId = null, emailType = 'general') {
  const settings = getSettings();
  if (!settings.smtp_user || !settings.smtp_pass) {
    console.log('[Email] Not configured. Skipping:', subject);
    return { success: false, error: 'Email not configured' };
  }
  try {
    const transporter = createTransporter(settings);
    await transporter.sendMail({ from: settings.email_from || settings.smtp_user, to, subject, html });
    logEmail(studentId, emailType, subject, to, 'sent');
    return { success: true };
  } catch (err) {
    logEmail(studentId, emailType, subject, to, 'failed', err.message);
    return { success: false, error: err.message };
  }
}

function base(schoolName, content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1d1d1f}
.wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,.08)}
.head{background:#1c1c1e;padding:28px 32px;text-align:center}
.head h1{color:#fff;font-size:20px;font-weight:600;letter-spacing:-.3px}
.head p{color:rgba(255,255,255,.5);font-size:13px;margin-top:4px}
.body{padding:32px}
.body p{font-size:15px;line-height:1.6;color:#1d1d1f;margin-bottom:14px}
.box{background:#f5f5f7;border-radius:12px;padding:16px 20px;margin:16px 0}
.box .lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#86868b}
.box .val{font-size:18px;font-weight:600;color:#1d1d1f;margin-top:2px}
.box .val.blue{color:#0071e3}
.box .val.green{color:#34c759}
.box .val.red{color:#ff3b30}
.cred{background:#f5f5f7;border-radius:12px;padding:20px;margin:16px 0;border:1px solid #e8e8ed}
.cred-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e8e8ed}
.cred-row:last-child{border-bottom:none}
.cred-lbl{font-size:13px;color:#86868b}
.cred-val{font-size:15px;font-weight:600;color:#1d1d1f;font-family:monospace;background:#fff;padding:4px 10px;border-radius:6px}
.foot{background:#f5f5f7;padding:20px 32px;text-align:center;font-size:12px;color:#86868b;border-top:1px solid #e8e8ed}
hr{border:none;border-top:1px solid #e8e8ed;margin:20px 0}
</style></head><body>
<div class="wrap">
<div class="head"><h1>🪷 ${schoolName}</h1><p>Classical Bharatanatyam Dance Studio</p></div>
<div class="body">${content}</div>
<div class="foot">${schoolName} · Bharatanatyam Dance Studio<br>This is an automated message.</div>
</div></body></html>`;
}

async function sendWelcomeEmail(student, plainPassword) {
  const settings = getSettings();
  const s = settings.school_name || 'Tritiya Dance Studio';
  const appUrl = settings.app_url || '';
  const subject = `Welcome to ${s} – Login Details for ${student.name}`;
  const html = base(s, `
    <p>Dear ${student.parent_name || 'Parent/Guardian'},</p>
    <p>Welcome to <strong>${s}</strong>! We're thrilled to have <strong>${student.name}</strong> join our Bharatanatyam family.</p>
    <div class="box"><div class="lbl">Student</div><div class="val">${student.name}</div></div>
    <div class="box"><div class="lbl">Level</div><div class="val">${student.level}</div></div>
    <div class="box"><div class="lbl">Monthly Fee</div><div class="val blue">${settings.currency || '₹'}${student.monthly_fee}</div></div>
    <hr>
    <p><strong>Your Parent Portal Login</strong></p>
    <p>Use these credentials to track attendance, fees and lesson plans:</p>
    <div class="cred">
      <div class="cred-row"><span class="cred-lbl">Username</span><span class="cred-val">${student.parent_username}</span></div>
      <div class="cred-row"><span class="cred-lbl">Password</span><span class="cred-val">${plainPassword || student.parent_pin || '—'}</span></div>
      ${appUrl ? `<div class="cred-row"><span class="cred-lbl">Portal URL</span><span class="cred-val">${appUrl}</span></div>` : ''}
    </div>
    <p style="font-size:13px;color:#86868b">Please keep these credentials safe. You can change your password after logging in.</p>
    ${settings.upi_qr_image ? `<hr><p style="font-size:14px;font-weight:600;color:#1d1d1f;margin-bottom:8px">💳 Fee Payment via UPI</p><p style="font-size:13px;color:#6e6e73;margin-bottom:12px">Scan the QR code below to pay monthly fees:</p><div style="text-align:center;margin:16px 0"><img src="${settings.upi_qr_image}" alt="UPI QR Code" style="max-width:220px;border-radius:12px;border:1px solid #e8e8ed;padding:12px;background:#fff" /></div>` : ''}
    <p>With warm regards,<br><strong>${s}</strong></p>
  `);
  return sendEmail(student.parent_email, subject, html, student.id, 'welcome');
}

async function sendPaymentReminder(payment, student) {
  const settings = getSettings();
  const s = settings.school_name || 'Tritiya Dance Studio';
  const currency = settings.currency || '₹';
  const isOverdue = new Date(payment.due_date) < new Date();
  const subject = isOverdue ? `⚠️ Payment Overdue – ${s}` : `Payment Reminder – ${s}`;
  const html = base(s, `
    <p>Dear ${student.parent_name || 'Parent/Guardian'},</p>
    <p>${isOverdue ? `The fee payment for <strong>${student.name}</strong> is <strong style="color:#ff3b30">overdue</strong>.` : `This is a reminder that the fee payment for <strong>${student.name}</strong> is due.`}</p>
    <div class="box"><div class="lbl">Student</div><div class="val">${student.name}</div></div>
    <div class="box"><div class="lbl">Amount Due</div><div class="val ${isOverdue ? 'red' : 'blue'}">${currency}${payment.amount}</div></div>
    <div class="box"><div class="lbl">Due Date</div><div class="val">${new Date(payment.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div></div>
    ${payment.description ? `<div class="box"><div class="lbl">Description</div><div class="val" style="font-size:15px">${payment.description}</div></div>` : ''}
    <p>Please make the payment at your earliest convenience.</p>
    ${settings.upi_qr_image ? `<div style="text-align:center;margin:20px 0"><p style="font-size:14px;font-weight:600;color:#1d1d1f;margin-bottom:8px">💳 Pay via UPI</p><img src="${settings.upi_qr_image}" alt="UPI QR Code" style="max-width:200px;border-radius:12px;border:1px solid #e8e8ed;padding:10px;background:#fff" /></div>` : ''}
    ${payment.reminder_count > 0 ? `<p style="font-size:13px;color:#86868b">Reminder #${payment.reminder_count + 1}</p>` : ''}
    <p>Regards,<br><strong>${s}</strong></p>
  `);
  const result = await sendEmail(student.parent_email, subject, html, student.id, 'payment_reminder');
  if (result.success) db.prepare(`UPDATE payments SET reminder_count=reminder_count+1, last_reminder_sent=datetime('now') WHERE id=?`).run(payment.id);
  return result;
}

async function sendScheduleReminder(student, classInfo, sessionDate) {
  const settings = getSettings();
  const s = settings.school_name || 'Tritiya Dance Studio';
  const dateStr = new Date(sessionDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const subject = `Class Tomorrow – ${classInfo.name} | ${s}`;
  const html = base(s, `
    <p>Dear ${student.parent_name || 'Parent/Guardian'},</p>
    <p>A reminder about <strong>${student.name}'s</strong> upcoming class.</p>
    <div class="box"><div class="lbl">Class</div><div class="val">${classInfo.name}</div></div>
    <div class="box"><div class="lbl">Date</div><div class="val">${dateStr}</div></div>
    <div class="box"><div class="lbl">Time</div><div class="val">${classInfo.start_time} – ${classInfo.end_time}</div></div>
    <p>Please ensure ${student.name} arrives 5–10 minutes early in dance attire.</p>
    <p>Regards,<br><strong>${s}</strong></p>
  `);
  return sendEmail(student.parent_email, subject, html, student.id, 'schedule_reminder');
}

async function sendLessonPlanEmail(student, plan, settings) {
  const s = settings.school_name || 'Tritiya Dance Studio';
  const dateStr = new Date(plan.plan_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const subject = `Lesson Plan: ${plan.subject} – ${dateStr} | ${s}`;
  const html = base(s, `
    <p>Dear ${student.parent_name || 'Parent/Guardian'},</p>
    <p>Here is the lesson plan for <strong>${student.name}'s</strong> upcoming class.</p>
    <div class="box"><div class="lbl">Date</div><div class="val">${dateStr}</div></div>
    <div class="box"><div class="lbl">Subject</div><div class="val blue">${plan.subject}</div></div>
    ${plan.topic ? `<div class="box"><div class="lbl">Topic</div><div class="val" style="font-size:15px">${plan.topic}</div></div>` : ''}
    ${plan.description ? `<div class="box"><div class="lbl">Details</div><div class="val" style="font-size:15px">${plan.description}</div></div>` : ''}
    ${plan.homework ? `<div class="box"><div class="lbl">Practice / Homework</div><div class="val" style="font-size:15px;color:#ff9500">${plan.homework}</div></div>` : ''}
    <div class="box"><div class="lbl">Class Time</div><div class="val">${plan.start_time} – ${plan.end_time}</div></div>
    <p>Please help ${student.name} prepare for this session.</p>
    <p>Regards,<br><strong>${s}</strong></p>
  `);
  return sendEmail(student.parent_email, subject, html, student.id, 'lesson_plan');
}

async function sendTestEmail(toEmail) {
  const settings = getSettings();
  const s = settings.school_name || 'Tritiya Dance Studio';
  const html = base(s, `<p>Hello!</p><p>This is a test email from <strong>${s}</strong>. Your email configuration is working correctly! ✅</p>`);
  return sendEmail(toEmail, `Test Email – ${s}`, html, null, 'test');
}

module.exports = { sendEmail, sendWelcomeEmail, sendPaymentReminder, sendScheduleReminder, sendLessonPlanEmail, sendTestEmail };
