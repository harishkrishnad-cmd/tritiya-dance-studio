const db = require('../database');

function getSettings() {
  return db.prepare('SELECT key, value FROM settings').all()
    .reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
}

function logWhatsApp(studentId, lessonPlanId, phone, message, status, error = null) {
  db.prepare(`INSERT INTO whatsapp_logs (student_id, lesson_plan_id, phone, message, status, error_message, sent_via)
    VALUES (?, ?, ?, ?, ?, ?, 'twilio')`).run(studentId, lessonPlanId, phone, message, status, error);
}

function formatPhone(phone) {
  // Strip spaces/dashes, ensure it starts with country code
  let p = phone.replace(/[\s\-\(\)]/g, '');
  if (!p.startsWith('+')) {
    // Assume India if no country code
    p = '+91' + p.replace(/^0/, '');
  }
  return 'whatsapp:' + p;
}

async function sendWhatsApp(phone, message, studentId = null, lessonPlanId = null) {
  const settings = getSettings();

  if (settings.whatsapp_enabled !== 'true') {
    console.log('[WhatsApp] Not enabled. Message would go to:', phone);
    logWhatsApp(studentId, lessonPlanId, phone, message, 'skipped');
    return { success: false, error: 'WhatsApp not configured' };
  }

  const { twilio_account_sid, twilio_auth_token, twilio_whatsapp_from } = settings;
  if (!twilio_account_sid || !twilio_auth_token) {
    logWhatsApp(studentId, lessonPlanId, phone, message, 'failed', 'Twilio not configured');
    return { success: false, error: 'Twilio credentials not set' };
  }

  try {
    const twilio = require('twilio')(twilio_account_sid, twilio_auth_token);
    const result = await twilio.messages.create({
      from: twilio_whatsapp_from || 'whatsapp:+14155238886',
      to: formatPhone(phone),
      body: message,
    });
    logWhatsApp(studentId, lessonPlanId, phone, message, 'sent');
    console.log('[WhatsApp] Sent to', phone, '| SID:', result.sid);
    return { success: true, sid: result.sid };
  } catch (err) {
    logWhatsApp(studentId, lessonPlanId, phone, message, 'failed', err.message);
    console.error('[WhatsApp] Error:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendPaymentWhatsApp(payment, student, settings) {
  const currency = settings.currency || '₹';
  const isOverdue = payment.status === 'overdue';
  const msg = `🪷 *${settings.school_name || 'Tritiya Dance Studio'}*\n\nDear ${student.parent_name || 'Parent'},\n\n${isOverdue ? '⚠️ *Payment Overdue*' : '💳 *Payment Reminder*'}\n\n👤 Student: *${student.name}*\n💰 Amount: *${currency}${payment.amount}*\n📅 Due: *${new Date(payment.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}*\n${payment.description ? `📝 ${payment.description}\n` : ''}\nPlease clear this at your earliest convenience.\n\n_Tritiya Dance Studio_`;
  return sendWhatsApp(student.parent_phone, msg, student.id, null);
}

module.exports = { sendWhatsApp, sendPaymentWhatsApp };
