const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendWelcomeEmail } = require('../services/emailService');

// List all students
router.get('/', (req, res) => {
  const { active, search } = req.query;
  let query = `SELECT * FROM students WHERE 1=1`;
  const params = [];
  if (active !== undefined) { query += ` AND active = ?`; params.push(active === 'true' ? 1 : 0); }
  if (search) { query += ` AND (name LIKE ? OR parent_name LIKE ? OR parent_email LIKE ?)`; const s = `%${search}%`; params.push(s, s, s); }
  query += ` ORDER BY name`;
  res.json(db.prepare(query).all(...params));
});

// Get single student with class enrollments
router.get('/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  student.classes = db.prepare(`
    SELECT c.*, sc.enrolled_date, sc.id as enrollment_id
    FROM classes c JOIN student_classes sc ON sc.class_id = c.id
    WHERE sc.student_id = ? AND sc.active = 1
  `).all(req.params.id);
  student.recentPayments = db.prepare(`
    SELECT * FROM payments WHERE student_id = ? ORDER BY due_date DESC LIMIT 12
  `).all(req.params.id);
  student.attendanceSummary = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late
    FROM attendance a
    JOIN class_sessions cs ON cs.id = a.session_id
    WHERE a.student_id = ?
  `).get(req.params.id);
  res.json(student);
});

// Create student
router.post('/', async (req, res) => {
  const { name, date_of_birth, level, enrollment_date, parent_name, parent_email, parent_phone, emergency_contact, address, monthly_fee, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = db.prepare(`
    INSERT INTO students (name, date_of_birth, level, enrollment_date, parent_name, parent_email, parent_phone, emergency_contact, address, monthly_fee, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, date_of_birth, level || 'Beginner', enrollment_date || new Date().toISOString().split('T')[0], parent_name, parent_email, parent_phone, emergency_contact, address, monthly_fee || 0, notes);

  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);

  // Send welcome email if email provided
  if (parent_email) {
    sendWelcomeEmail(student).catch(console.error);
  }

  res.status(201).json(student);
});

// Update student
router.put('/:id', (req, res) => {
  const { name, date_of_birth, level, enrollment_date, parent_name, parent_email, parent_phone, emergency_contact, address, monthly_fee, notes, active } = req.body;
  db.prepare(`
    UPDATE students SET name=?, date_of_birth=?, level=?, enrollment_date=?, parent_name=?, parent_email=?, parent_phone=?, emergency_contact=?, address=?, monthly_fee=?, notes=?, active=?
    WHERE id=?
  `).run(name, date_of_birth, level, enrollment_date, parent_name, parent_email, parent_phone, emergency_contact, address, monthly_fee, notes, active !== undefined ? active : 1, req.params.id);
  res.json(db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id));
});

// Delete (soft)
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE students SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Enroll in class
router.post('/:id/enroll', (req, res) => {
  const { class_id } = req.body;
  try {
    db.prepare(`INSERT OR REPLACE INTO student_classes (student_id, class_id, active) VALUES (?, ?, 1)`).run(req.params.id, class_id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Unenroll from class
router.delete('/:id/enroll/:classId', (req, res) => {
  db.prepare('UPDATE student_classes SET active = 0 WHERE student_id = ? AND class_id = ?').run(req.params.id, req.params.classId);
  res.json({ success: true });
});

module.exports = router;
