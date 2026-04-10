const express = require('express');
const router = express.Router();
const db = require('../database');
const { verifyToken } = require('./auth');

function adminOnly(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verifyToken(auth.replace('Bearer ', ''));
  if (!payload || payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

const TABLES = [
  'students', 'payments', 'attendance', 'classes', 'class_sessions',
  'lesson_plans', 'settings', 'website_settings', 'testimonials',
  'courses', 'course_materials', 'quizzes', 'quiz_questions',
  'student_progress', 'quiz_attempts', 'student_badges', 'student_points',
  'enrollment_links',
];

// GET /api/backup — download full DB as JSON
router.get('/', adminOnly, (req, res) => {
  const backup = { version: 1, exported_at: new Date().toISOString(), tables: {} };
  for (const table of TABLES) {
    try {
      backup.tables[table] = db.prepare(`SELECT * FROM ${table}`).all();
    } catch {
      backup.tables[table] = []; // table may not exist yet
    }
  }
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tritiya-backup-${new Date().toISOString().slice(0,10)}.json"`);
  res.json(backup);
});

// POST /api/backup/restore — restore from JSON backup
router.post('/restore', adminOnly, (req, res) => {
  const backup = req.body;
  if (!backup || !backup.tables || backup.version !== 1) {
    return res.status(400).json({ error: 'Invalid backup file format' });
  }
  const restore = db.transaction(() => {
    for (const [table, rows] of Object.entries(backup.tables)) {
      if (!TABLES.includes(table)) continue;
      if (!Array.isArray(rows) || rows.length === 0) continue;
      try {
        // Delete existing data and reinsert
        db.prepare(`DELETE FROM ${table}`).run();
        const cols = Object.keys(rows[0]);
        const placeholders = cols.map(() => '?').join(', ');
        const insert = db.prepare(`INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);
        for (const row of rows) insert.run(cols.map(c => row[c]));
      } catch (e) {
        console.warn(`[Backup] Skipped table ${table}:`, e.message);
      }
    }
  });
  restore();
  res.json({ success: true, restored_at: new Date().toISOString() });
});

module.exports = router;
