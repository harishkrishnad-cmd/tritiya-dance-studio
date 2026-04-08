const nodemailer = require('nodemailer');
const db = require('../database');

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return rows.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
}

function createTransporter(settings) {
  return nodemailer.createTransport({
    host: settings.smtp_host,
    port: parseInt(settings.smtp_port) || 587,
    secure: settings.smtp_secure === 'true',
    auth: {
      user: settings.smtp_user,
      pass: settings.smtp_pass,
    },
  });
}

function logEmail(studentId, type, subject, recipientEmail, status, errorMessage = null) {
  db.prepare(`
    INSERT INTO email_logs (student_id, email_type, subject, recipient_email, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, type, subject, recipientEmail, status, errorMessage);
}

async function sendEmail(to, subject, html, studentId = null, emailType = 'general') {
  const settings = getSettings();
  if (!settings.smtp_user || !settings.smtp_pass) {
    console.log('Email not configured. Skipping:', subject);
    return { success: false, error: 'Email not configured' };
  }
  try {
    const transporter = createTransporter(settings);
    const from = settings.email_from || settings.smtp_user;
    await transporter.sendMail({ from, to, subject, html });
    logEmail(studentId, emailType, subject, to, 'sent');
    return { success: true };
  } catch (err) {
    logEmail(studentId, emailType, subject, to, 'failed', err.message);
    return { success: false, error: err.message };
  }
}

function baseTemplate(schoolName, content) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; background: #f8f4f0; font-family: Georgia, serif; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: linear-gradient(135deg, #7c1c1c 0%, #c0392b 100%); padding: 30px 40px; text-align: center; }
  .header h1 { color: #ffd700; margin: 0; font-size: 28px; letter-spacing: 2px; }
  .header p { color: #fde8c8; margin: 5px 0 0; font-size: 13px; letter-spacing: 1px; }
  .ornament { text-align: center; color: #c0392b; font-size: 22px; padding: 15px; background: #fff8f0; border-top: 2px solid #f0e0d0; border-bottom: 2px solid #f0e0d0; }
  .body { padding: 35px 40px; }
  .body p { color: #333; font-size: 15px; line-height: 1.7; margin: 0 0 15px; }
  .info-box { background: #fff8f0; border-left: 4px solid #c0392b; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  .info-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
  .info-box .value { font-size: 20px; font-weight: bold; color: #c0392b; }
  .button { display: inline-block; background: #c0392b; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-size: 14px; margin: 15px 0; }
  .footer { background: #1a1a1a; color: #888; text-align: center; padding: 20px 40px; font-size: 12px; }
  .footer a { color: #ffd700; text-decoration: none; }
  .divider { border: none; border-top: 1px solid #f0e0d0; margin: 20px 0; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🪷 ${schoolName}</h1>
    <p>Classical Bharatanatyam Dance Studio</p>
  </div>
  <div class="ornament">❋ ❋ ❋</div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>${schoolName} &bull; Classical Bharatanatyam Dance Studio</p>
    <p>This is an automated message. Please do not reply directly.</p>
  </div>
</div>
</body>
</html>`;
}

async function sendWelcomeEmail(student) {
  const settings = getSettings();
  const schoolName = settings.school_name || 'Tritiya Dance Studio';
  const subject = `Welcome to ${schoolName} - ${student.name}`;
  const html = baseTemplate(schoolName, `
    <p>Dear ${student.parent_name || 'Parent/Guardian'},</p>
    <p>We are delighted to welcome <strong>${student.name}</strong> to <strong>${schoolName}</strong>! 🎊</p>
    <p>Bharatanatyam is one of the oldest and most celebrated classical dance forms of India. We look forward to nurturing ${student.name}'s journey through this beautiful art form.</p>
    <div class="info-box">
      <div class="label">Student Name</div>
      <div class="value" style="font-size:16px; color:#333;">${student.name}</div>
    </div>
    <div class="info-box">
      <div class="label">Dance Level</div>
      <div class="value" style="font-size:16px; color:#333;">${student.level}</div>
    </div>
    <div class="info-box">
      <div class="label">Monthly Fee</div>
      <div class="value">${settings.currency || '₹'}${student.monthly_fee}</div>
    </div>
    <hr class="divider">
    <p>If you have any questions about classes, schedules, or fees, please feel free to contact us.</p>
    <p>With warm regards,<br><strong>${schoolName}</strong></p>
  `);
  return sendEmail(student.parent_email, subject, html, student.id, 'welcome');
}

async function sendPaymentReminder(payment, student) {
  const settings = getSettings();
  const schoolName = settings.school_name || 'Tritiya Dance Studio';
  const currency = settings.currency || '₹';
  const isOverdue = new Date(payment.due_date) < new Date();
  const subject = isOverdue
    ? `⚠️ Payment Overdue - ${schoolName} (${student.name})`
    : `Payment Due Reminder - ${schoolName} (${student.name})`;

  const html = baseTemplate(schoolName, `
    <p>Dear ${student.parent_name || 'Parent/Guardian'},</p>
    <p>${isOverdue
      ? `This is a reminder that the fee payment for <strong>${student.name}</strong> is <strong style="color:#c0392b;">overdue</strong>.`
      : `This is a friendly reminder that the fee payment for <strong>${student.name}</strong> is due.`
    }</p>
    <div class="info-box">
      <div class="label">Student</div>
      <div class="value" style="font-size:16px; color:#333;">${student.name}</div>
    </div>
    <div class="info-box">
      <div class="label">Amount Due</div>
      <div class="value">${currency}${payment.amount}</div>
    </div>
    <div class="info-box">
      <div class="label">Due Date</div>
      <div class="value" style="font-size:16px; color:${isOverdue ? '#c0392b' : '#333'};">${new Date(payment.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
    ${payment.description ? `<div class="info-box"><div class="label">Description</div><div class="value" style="font-size:14px;color:#555;">${payment.description}</div></div>` : ''}
    <hr class="divider">
    <p>Please make the payment at the earliest convenience. You can pay via cash, UPI, or bank transfer at the academy.</p>
    ${payment.reminder_count > 0 ? `<p style="color:#888; font-size:13px;">Reminder #${payment.reminder_count + 1}</p>` : ''}
    <p>With regards,<br><strong>${schoolName}</strong></p>
  `);

  const result = await sendEmail(student.parent_email, subject, html, student.id, 'payment_reminder');
  if (result.success) {
    db.prepare(`UPDATE payments SET reminder_count = reminder_count + 1, last_reminder_sent = datetime('now') WHERE id = ?`).run(payment.id);
  }
  return result;
}

async function sendScheduleReminder(student, classInfo, sessionDate) {
  const settings = getSettings();
  const schoolName = settings.school_name || 'Tritiya Dance Studio';
  const subject = `Class Tomorrow - ${classInfo.name} | ${schoolName}`;
  const dateStr = new Date(sessionDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const html = baseTemplate(schoolName, `
    <p>Dear ${student.parent_name || 'Parent/Guardian'},</p>
    <p>This is a friendly reminder about <strong>${student.name}'s</strong> upcoming Bharatanatyam class.</p>
    <div class="info-box">
      <div class="label">Class</div>
      <div class="value" style="font-size:16px;color:#333;">${classInfo.name}</div>
    </div>
    <div class="info-box">
      <div class="label">Date</div>
      <div class="value" style="font-size:16px;color:#333;">${dateStr}</div>
    </div>
    <div class="info-box">
      <div class="label">Time</div>
      <div class="value" style="font-size:16px;color:#333;">${classInfo.start_time} – ${classInfo.end_time}</div>
    </div>
    <hr class="divider">
    <p>Please ensure ${student.name} arrives 5–10 minutes early and is dressed in dance attire.</p>
    <p>With regards,<br><strong>${schoolName}</strong></p>
  `);
  return sendEmail(student.parent_email, subject, html, student.id, 'schedule_reminder');
}

async function sendTestEmail(toEmail) {
  const settings = getSettings();
  const schoolName = settings.school_name || 'Tritiya Dance Studio';
  const subject = `Test Email - ${schoolName}`;
  const html = baseTemplate(schoolName, `
    <p>Hello!</p>
    <p>This is a test email from <strong>${schoolName}</strong>. If you received this, your email configuration is working correctly! 🎉</p>
    <p>You can now use automated email reminders for payments and class schedules.</p>
  `);
  return sendEmail(toEmail, subject, html, null, 'test');
}

module.exports = { sendEmail, sendWelcomeEmail, sendPaymentReminder, sendScheduleReminder, sendTestEmail };
