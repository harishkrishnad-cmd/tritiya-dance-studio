const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendLessonPlanEmail } = require('../services/emailService');
const { sendWhatsApp } = require('../services/whatsappService');

// List lesson plans
router.get('/', (req, res) => {
  const { class_id, from, to, month, year } = req.query;
  let q = `
    SELECT lp.*, c.name as class_name, c.day_of_week, c.start_time, c.end_time
    FROM lesson_plans lp JOIN classes c ON c.id = lp.class_id WHERE 1=1
  `;
  const p = [];
  if (class_id) { q += ` AND lp.class_id = ?`; p.push(class_id); }
  if (from) { q += ` AND lp.plan_date >= ?`; p.push(from); }
  if (to) { q += ` AND lp.plan_date <= ?`; p.push(to); }
  if (month) { q += ` AND strftime('%m', lp.plan_date) = ?`; p.push(String(month).padStart(2, '0')); }
  if (year) { q += ` AND strftime('%Y', lp.plan_date) = ?`; p.push(year); }
  q += ` ORDER BY lp.plan_date DESC`;
  res.json(db.prepare(q).all(...p));
});

// Get single plan
router.get('/:id', (req, res) => {
  const plan = db.prepare(`
    SELECT lp.*, c.name as class_name, c.day_of_week, c.start_time, c.end_time
    FROM lesson_plans lp JOIN classes c ON c.id = lp.class_id WHERE lp.id = ?
  `).get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Not found' });
  plan.students = db.prepare(`
    SELECT s.id, s.name, s.parent_name, s.parent_email, s.parent_phone
    FROM students s JOIN student_classes sc ON sc.student_id = s.id
    WHERE sc.class_id = ? AND sc.active = 1 AND s.active = 1
  `).all(plan.class_id);
  res.json(plan);
});

// Bulk import lesson plans from Excel
router.post('/bulk-import', (req, res) => {
  const { plans: rows } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'plans must be an array' });
  let imported = 0, skipped = 0;
  const insert = db.prepare('INSERT INTO lesson_plans (class_id, plan_date, subject, topic, description, homework, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const tx = db.transaction(() => {
    for (const row of rows) {
      if (!row.plan_date || !row.subject) { skipped++; continue; }
      // Resolve class by name or id
      let class_id = row.class_id;
      if (!class_id && row.class_name) {
        const cls = db.prepare('SELECT id FROM classes WHERE name = ? AND active = 1').get(String(row.class_name).trim());
        if (cls) class_id = cls.id;
      }
      if (!class_id) { skipped++; continue; }
      insert.run(class_id, row.plan_date.trim(), row.subject.trim(), row.topic || '', row.description || '', row.homework || '', parseInt(row.duration_minutes) || 60);
      imported++;
    }
  });
  tx();
  res.json({ imported, skipped });
});

// Create plan
router.post('/', (req, res) => {
  const { class_id, plan_date, subject, topic, description, homework, duration_minutes } = req.body;
  if (!class_id || !plan_date || !subject) return res.status(400).json({ error: 'class_id, plan_date and subject required' });
  const result = db.prepare(`
    INSERT INTO lesson_plans (class_id, plan_date, subject, topic, description, homework, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(class_id, plan_date, subject, topic, description, homework, duration_minutes || 90);
  res.status(201).json(db.prepare('SELECT lp.*, c.name as class_name FROM lesson_plans lp JOIN classes c ON c.id=lp.class_id WHERE lp.id=?').get(result.lastInsertRowid));
});

// Update plan
router.put('/:id', (req, res) => {
  const { subject, topic, description, homework, duration_minutes, status } = req.body;
  db.prepare(`UPDATE lesson_plans SET subject=?, topic=?, description=?, homework=?, duration_minutes=?, status=? WHERE id=?`)
    .run(subject, topic, description, homework, duration_minutes, status || 'planned', req.params.id);
  res.json(db.prepare('SELECT * FROM lesson_plans WHERE id=?').get(req.params.id));
});

// Delete plan
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM lesson_plans WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Notify parents (WhatsApp + Email) for a lesson plan
router.post('/:id/notify', async (req, res) => {
  const plan = db.prepare(`
    SELECT lp.*, c.name as class_name, c.start_time, c.end_time
    FROM lesson_plans lp JOIN classes c ON c.id = lp.class_id WHERE lp.id = ?
  `).get(req.params.id);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const students = db.prepare(`
    SELECT s.* FROM students s JOIN student_classes sc ON sc.student_id = s.id
    WHERE sc.class_id = ? AND sc.active = 1 AND s.active = 1
  `).all(plan.class_id);

  const settings = db.prepare('SELECT key, value FROM settings').all()
    .reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});

  const results = { whatsapp: { sent: 0, failed: 0 }, email: { sent: 0, failed: 0 } };
  const dateStr = new Date(plan.plan_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  for (const student of students) {
    // WhatsApp
    if (settings.whatsapp_enabled === 'true' && student.parent_phone) {
      const msg = `🪷 *${settings.school_name || 'Tritiya Dance Studio'}*\n\nDear ${student.parent_name || 'Parent'},\n\n📅 *Class Plan: ${dateStr}*\n🎵 *Subject:* ${plan.subject}\n${plan.topic ? `📖 *Topic:* ${plan.topic}\n` : ''}${plan.description ? `📝 *Details:* ${plan.description}\n` : ''}${plan.homework ? `✏️ *Homework:* ${plan.homework}\n` : ''}\n⏰ *Time:* ${plan.start_time} – ${plan.end_time}\n\nPlease ensure ${student.name} is ready for class.\n\n_View your child's portal: ${settings.app_url || ''}_`;
      const r = await sendWhatsApp(student.parent_phone, msg, student.id, plan.id);
      if (r.success) results.whatsapp.sent++; else results.whatsapp.failed++;
    }
    // Email
    if (student.parent_email) {
      const r = await sendLessonPlanEmail(student, plan, settings);
      if (r.success) results.email.sent++; else results.email.failed++;
    }
  }

  // Mark as sent
  db.prepare('UPDATE lesson_plans SET whatsapp_sent=1, whatsapp_sent_at=datetime("now"), status="sent" WHERE id=?').run(plan.id);
  res.json({ success: true, results, students_notified: students.length });
});

// Upcoming plans for a student (parent portal)
router.get('/student/:studentId', (req, res) => {
  const plans = db.prepare(`
    SELECT lp.*, c.name as class_name, c.start_time, c.end_time
    FROM lesson_plans lp
    JOIN classes c ON c.id = lp.class_id
    JOIN student_classes sc ON sc.class_id = c.id
    WHERE sc.student_id = ? AND sc.active = 1
    ORDER BY lp.plan_date DESC LIMIT 30
  `).all(req.params.studentId);
  res.json(plans);
});

module.exports = router;
