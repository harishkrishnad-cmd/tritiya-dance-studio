const express = require('express');
const router = express.Router();
const db = require('../database');

// List sessions (optionally filter by class or date range)
router.get('/sessions', (req, res) => {
  const { class_id, from, to } = req.query;
  let query = `
    SELECT cs.*, c.name as class_name, c.day_of_week, c.start_time, c.end_time,
      (SELECT COUNT(*) FROM attendance a WHERE a.session_id = cs.id) as marked_count,
      (SELECT COUNT(*) FROM student_classes sc WHERE sc.class_id = cs.class_id AND sc.active = 1) as enrolled_count
    FROM class_sessions cs JOIN classes c ON c.id = cs.class_id WHERE 1=1
  `;
  const params = [];
  if (class_id) { query += ` AND cs.class_id = ?`; params.push(class_id); }
  if (from) { query += ` AND cs.session_date >= ?`; params.push(from); }
  if (to) { query += ` AND cs.session_date <= ?`; params.push(to); }
  query += ` ORDER BY cs.session_date DESC`;
  res.json(db.prepare(query).all(...params));
});

// Get single session with attendance
router.get('/sessions/:id', (req, res) => {
  const session = db.prepare(`
    SELECT cs.*, c.name as class_name, c.start_time, c.end_time
    FROM class_sessions cs JOIN classes c ON c.id = cs.class_id WHERE cs.id = ?
  `).get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Get enrolled students with their attendance status
  session.students = db.prepare(`
    SELECT s.id, s.name, s.level,
      COALESCE(a.status, 'not_marked') as status,
      a.notes, a.id as attendance_id
    FROM students s
    JOIN student_classes sc ON sc.student_id = s.id
    LEFT JOIN attendance a ON a.session_id = ? AND a.student_id = s.id
    WHERE sc.class_id = ? AND sc.active = 1 AND s.active = 1
    ORDER BY s.name
  `).all(req.params.id, session.class_id);

  res.json(session);
});

// Create session
router.post('/sessions', (req, res) => {
  const { class_id, session_date, notes, status } = req.body;
  if (!class_id || !session_date) return res.status(400).json({ error: 'class_id and session_date required' });

  // Check if session already exists for this class+date
  const existing = db.prepare('SELECT * FROM class_sessions WHERE class_id = ? AND session_date = ?').get(class_id, session_date);
  if (existing) return res.json(existing);

  const result = db.prepare(`
    INSERT INTO class_sessions (class_id, session_date, notes, status) VALUES (?, ?, ?, ?)
  `).run(class_id, session_date, notes, status || 'scheduled');
  res.status(201).json(db.prepare('SELECT * FROM class_sessions WHERE id = ?').get(result.lastInsertRowid));
});

// Update session
router.put('/sessions/:id', (req, res) => {
  const { notes, status } = req.body;
  db.prepare('UPDATE class_sessions SET notes=?, status=? WHERE id=?').run(notes, status, req.params.id);
  res.json(db.prepare('SELECT * FROM class_sessions WHERE id = ?').get(req.params.id));
});

// Mark attendance for a session (bulk)
router.post('/sessions/:id/mark', (req, res) => {
  const { attendance } = req.body; // [{ student_id, status, notes }]
  if (!Array.isArray(attendance)) return res.status(400).json({ error: 'attendance array required' });

  const upsert = db.prepare(`
    INSERT INTO attendance (session_id, student_id, status, notes) VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id, student_id) DO UPDATE SET status=excluded.status, notes=excluded.notes
  `);
  const markAll = db.transaction((items) => {
    for (const item of items) {
      upsert.run(req.params.id, item.student_id, item.status || 'present', item.notes || null);
    }
  });
  markAll(attendance);

  // Mark session as completed
  db.prepare(`UPDATE class_sessions SET status = 'completed' WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

// Student attendance history
router.get('/student/:studentId', (req, res) => {
  const records = db.prepare(`
    SELECT a.*, cs.session_date, c.name as class_name, c.start_time
    FROM attendance a
    JOIN class_sessions cs ON cs.id = a.session_id
    JOIN classes c ON c.id = cs.class_id
    WHERE a.student_id = ?
    ORDER BY cs.session_date DESC
    LIMIT 50
  `).all(req.params.studentId);
  res.json(records);
});

// Stats for a class
router.get('/stats/class/:classId', (req, res) => {
  const stats = db.prepare(`
    SELECT
      cs.session_date,
      COUNT(a.id) as total_marked,
      SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN a.status='late' THEN 1 ELSE 0 END) as late
    FROM class_sessions cs
    LEFT JOIN attendance a ON a.session_id = cs.id
    WHERE cs.class_id = ?
    GROUP BY cs.id
    ORDER BY cs.session_date DESC
    LIMIT 20
  `).all(req.params.classId);
  res.json(stats);
});

// Bulk import attendance from Excel
router.post('/bulk-import', (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records)) return res.status(400).json({ error: 'records must be an array' });
  let imported = 0, skipped = 0;
  const VALID_STATUS = ['present', 'absent', 'late'];

  const tx = db.transaction(() => {
    for (const row of records) {
      if (!row.class_name || !row.date || !row.student_name || !row.status) { skipped++; continue; }
      const status = String(row.status).toLowerCase().trim();
      if (!VALID_STATUS.includes(status)) { skipped++; continue; }

      // Look up class by name
      const cls = db.prepare('SELECT id FROM classes WHERE name = ? AND active = 1').get(String(row.class_name).trim());
      if (!cls) { skipped++; continue; }

      // Look up student by name
      const student = db.prepare('SELECT id FROM students WHERE name LIKE ? AND active = 1').get(String(row.student_name).trim());
      if (!student) { skipped++; continue; }

      // Get or create session
      const existing = db.prepare('SELECT id FROM class_sessions WHERE class_id = ? AND session_date = ?').get(cls.id, row.date.trim());
      let sessionId;
      if (existing) {
        sessionId = existing.id;
      } else {
        const r = db.prepare('INSERT INTO class_sessions (class_id, session_date, status) VALUES (?, ?, ?)').run(cls.id, row.date.trim(), 'completed');
        sessionId = r.lastInsertRowid;
      }

      // Upsert attendance
      db.prepare(`
        INSERT INTO attendance (session_id, student_id, status, notes) VALUES (?, ?, ?, ?)
        ON CONFLICT(session_id, student_id) DO UPDATE SET status=excluded.status, notes=excluded.notes
      `).run(sessionId, student.id, status, row.notes || null);
      imported++;
    }
  });
  tx();
  res.json({ imported, skipped });
});

module.exports = router;
