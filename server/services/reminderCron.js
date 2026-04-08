const cron = require('node-cron');
const db = require('../database');
const { sendPaymentReminder, sendScheduleReminder } = require('./emailService');

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return rows.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
}

// Run every day at 9:00 AM - send payment reminders
function schedulePaymentReminders() {
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Running payment reminder job...');
    const settings = getSettings();
    if (settings.reminder_enabled !== 'true') return;

    const intervalDays = parseInt(settings.reminder_interval_days) || 3;
    const today = new Date().toISOString().split('T')[0];

    // Get all pending/overdue payments for active students with email
    const payments = db.prepare(`
      SELECT p.*, s.name as student_name, s.parent_name, s.parent_email, s.active
      FROM payments p
      JOIN students s ON s.id = p.student_id
      WHERE p.status IN ('pending', 'overdue')
        AND s.active = 1
        AND s.parent_email IS NOT NULL
        AND s.parent_email != ''
        AND p.due_date <= ?
        AND (
          p.last_reminder_sent IS NULL
          OR julianday('now') - julianday(p.last_reminder_sent) >= ?
        )
    `).all(today, intervalDays);

    // Also mark as overdue if past due date
    db.prepare(`
      UPDATE payments SET status = 'overdue'
      WHERE status = 'pending' AND due_date < ?
    `).run(today);

    console.log(`[CRON] Found ${payments.length} payments needing reminders`);

    for (const payment of payments) {
      const student = {
        id: payment.student_id,
        name: payment.student_name,
        parent_name: payment.parent_name,
        parent_email: payment.parent_email,
      };
      try {
        await sendPaymentReminder(payment, student);
        console.log(`[CRON] Sent payment reminder to ${payment.parent_email} for ${payment.student_name}`);
      } catch (err) {
        console.error(`[CRON] Failed to send reminder:`, err.message);
      }
    }
    console.log('[CRON] Payment reminder job done.');
  });
}

// Run every day at 6:00 PM - send schedule reminders for tomorrow's classes
function scheduleClassReminders() {
  cron.schedule('0 18 * * *', async () => {
    console.log('[CRON] Running schedule reminder job...');
    const settings = getSettings();
    if (settings.schedule_reminder_enabled !== 'true') return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayName = tomorrow.toLocaleDateString('en-US', { weekday: 'long' });

    // Find classes scheduled for tomorrow
    const classes = db.prepare(`
      SELECT * FROM classes WHERE day_of_week = ? AND active = 1
    `).all(dayName);

    for (const cls of classes) {
      // Find enrolled students with email
      const students = db.prepare(`
        SELECT s.* FROM students s
        JOIN student_classes sc ON sc.student_id = s.id
        WHERE sc.class_id = ? AND sc.active = 1 AND s.active = 1
          AND s.parent_email IS NOT NULL AND s.parent_email != ''
      `).all(cls.id);

      for (const student of students) {
        try {
          await sendScheduleReminder(student, cls, tomorrowStr);
          console.log(`[CRON] Sent schedule reminder to ${student.parent_email} for ${student.name}`);
        } catch (err) {
          console.error(`[CRON] Schedule reminder failed:`, err.message);
        }
      }
    }
    console.log('[CRON] Schedule reminder job done.');
  });
}

function startCronJobs() {
  schedulePaymentReminders();
  scheduleClassReminders();
  console.log('[CRON] Jobs scheduled: payment reminders (9 AM), schedule reminders (6 PM)');
}

module.exports = { startCronJobs };
