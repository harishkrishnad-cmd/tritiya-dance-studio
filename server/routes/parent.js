const express = require('express');
const router = express.Router();
const db = require('../database');

// Middleware: parent can only access their own student
function parentOwns(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (req.user.role === 'parent') {
    const studentId = parseInt(req.params.studentId || req.params.id);
    if (req.user.student_id !== studentId) return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

// Get student profile (parent view)
router.get('/student/:studentId', parentOwns, (req, res) => {
  const s = db.prepare('SELECT id, name, level, enrollment_date, date_of_birth, parent_name, parent_email, parent_phone, address, monthly_fee, notes FROM students WHERE id = ? AND active = 1').get(req.params.studentId);
  if (!s) return res.status(404).json({ error: 'Not found' });
  s.classes = db.prepare(`SELECT c.*, sc.enrolled_date FROM classes c JOIN student_classes sc ON sc.class_id = c.id WHERE sc.student_id = ? AND sc.active = 1`).all(req.params.studentId);
  res.json(s);
});

// Attendance history (parent view)
router.get('/student/:studentId/attendance', parentOwns, (req, res) => {
  const records = db.prepare(`
    SELECT a.status, a.notes, cs.session_date, c.name as class_name, c.start_time
    FROM attendance a
    JOIN class_sessions cs ON cs.id = a.session_id
    JOIN classes c ON c.id = cs.class_id
    WHERE a.student_id = ?
    ORDER BY cs.session_date DESC LIMIT 60
  `).all(req.params.studentId);
  const summary = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late
    FROM attendance WHERE student_id = ?
  `).get(req.params.studentId);
  res.json({ records, summary });
});

// Payments (parent view)
router.get('/student/:studentId/payments', parentOwns, (req, res) => {
  const payments = db.prepare(`SELECT * FROM payments WHERE student_id = ? ORDER BY due_date DESC LIMIT 24`).all(req.params.studentId);
  const stats = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN status='pending' OR status='overdue' THEN amount ELSE 0 END),0) as due,
           COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) as paid
    FROM payments WHERE student_id = ?
  `).get(req.params.studentId);
  res.json({ payments, stats });
});

// Lesson plans (parent view)
router.get('/student/:studentId/plans', parentOwns, (req, res) => {
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
