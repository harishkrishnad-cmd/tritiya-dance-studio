const express = require('express');
const router = express.Router();
const db = require('../database');

// List all classes
router.get('/', (req, res) => {
  const classes = db.prepare('SELECT * FROM classes WHERE active = 1 ORDER BY day_of_week, start_time').all();
  classes.forEach(c => {
    c.studentCount = db.prepare('SELECT COUNT(*) as cnt FROM student_classes WHERE class_id = ? AND active = 1').get(c.id).cnt;
  });
  res.json(classes);
});

// Get class with enrolled students
router.get('/:id', (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  cls.students = db.prepare(`
    SELECT s.*, sc.enrolled_date FROM students s
    JOIN student_classes sc ON sc.student_id = s.id
    WHERE sc.class_id = ? AND sc.active = 1 AND s.active = 1
    ORDER BY s.name
  `).all(req.params.id);
  cls.recentSessions = db.prepare(`
    SELECT * FROM class_sessions WHERE class_id = ? ORDER BY session_date DESC LIMIT 10
  `).all(req.params.id);
  res.json(cls);
});

// Create class
router.post('/', (req, res) => {
  const { name, day_of_week, start_time, end_time, level, description, max_students } = req.body;
  if (!name || !day_of_week || !start_time || !end_time) {
    return res.status(400).json({ error: 'Name, day, start time and end time are required' });
  }
  const result = db.prepare(`
    INSERT INTO classes (name, day_of_week, start_time, end_time, level, description, max_students)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, day_of_week, start_time, end_time, level || 'All', description, max_students || 20);
  res.status(201).json(db.prepare('SELECT * FROM classes WHERE id = ?').get(result.lastInsertRowid));
});

// Update class
router.put('/:id', (req, res) => {
  const { name, day_of_week, start_time, end_time, level, description, max_students, active } = req.body;
  db.prepare(`
    UPDATE classes SET name=?, day_of_week=?, start_time=?, end_time=?, level=?, description=?, max_students=?, active=?
    WHERE id=?
  `).run(name, day_of_week, start_time, end_time, level, description, max_students, active !== undefined ? active : 1, req.params.id);
  res.json(db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id));
});

// Delete (soft)
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE classes SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Enroll student
router.post('/:id/students', (req, res) => {
  const { student_id } = req.body;
  try {
    db.prepare(`INSERT OR REPLACE INTO student_classes (student_id, class_id, active) VALUES (?, ?, 1)`).run(student_id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Unenroll student
router.delete('/:id/students/:studentId', (req, res) => {
  db.prepare('UPDATE student_classes SET active = 0 WHERE class_id = ? AND student_id = ?').run(req.params.id, req.params.studentId);
  res.json({ success: true });
});

// List available students not yet in this class
router.get('/:id/available-students', (req, res) => {
  const students = db.prepare(`
    SELECT s.* FROM students s
    WHERE s.active = 1 AND s.id NOT IN (
      SELECT student_id FROM student_classes WHERE class_id = ? AND active = 1
    )
    ORDER BY s.name
  `).all(req.params.id);
  res.json(students);
});

module.exports = router;
