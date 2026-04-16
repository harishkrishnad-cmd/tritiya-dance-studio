const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendWelcomeEmail, sendActivationEmail } = require('../services/emailService');
const { hashPin } = require('./auth');

// List all students
router.get('/', (req, res) => {
  const { active, status, search } = req.query;
  let query = `SELECT * FROM students WHERE 1=1`;
  const params = [];
  // New status filter takes priority over legacy active filter
  if (status && status !== 'all') {
    query += ` AND status = ?`; params.push(status);
  } else if (!status && active !== undefined) {
    // Legacy backward-compatible: active=true/false
    query += ` AND active = ?`; params.push(active === 'true' ? 1 : 0);
  } else if (!status && active === undefined) {
    // Default: show active only
    query += ` AND (status = 'active' OR status IS NULL)`;
  }
  if (search) { query += ` AND (name LIKE ? OR parent_name LIKE ? OR parent_email LIKE ?)`; const s = `%${search}%`; params.push(s, s, s); }
  query += ` ORDER BY name`;
  res.json(db.prepare(query).all(...params));
});

// Get single student with details
router.get('/:id', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  student.classes = db.prepare(`
    SELECT c.*, sc.enrolled_date, sc.id as enrollment_id
    FROM classes c JOIN student_classes sc ON sc.class_id = c.id
    WHERE sc.student_id = ? AND sc.active = 1
  `).all(req.params.id);
  student.recentPayments = db.prepare(`SELECT * FROM payments WHERE student_id = ? ORDER BY due_date DESC LIMIT 12`).all(req.params.id);
  student.attendanceSummary = db.prepare(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent,
      SUM(CASE WHEN a.status='late' THEN 1 ELSE 0 END) as late
    FROM attendance a WHERE a.student_id = ?
  `).get(req.params.id);
  res.json(student);
});

// Create student
router.post('/', async (req, res) => {
  const { name, date_of_birth, level, enrollment_date, parent_name, parent_email,
    parent_phone, emergency_contact, address, monthly_fee, notes, parent_username, parent_password, student_email, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  if (parent_email) {
    const dup = db.prepare("SELECT id FROM students WHERE parent_email=? AND active=1").get(parent_email.trim().toLowerCase());
    if (dup) return res.status(400).json({ error: 'A student with this parent email already exists.' });
  }

  // Auto-generate parent login if not provided
  const username = parent_username || (name.toLowerCase().replace(/\s+/g, '.') + Math.floor(Math.random() * 100));
  const password = parent_password || Math.random().toString(36).slice(-6).toUpperCase();
  const passwordHash = hashPin(password);

  try {
    const result = db.prepare(`
      INSERT INTO students (name, date_of_birth, level, enrollment_date, parent_name, parent_email,
        parent_phone, emergency_contact, address, monthly_fee, notes, parent_username, parent_password_hash, parent_pin, student_email, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, date_of_birth, level || 'Beginner',
      enrollment_date || new Date().toISOString().split('T')[0],
      parent_name, parent_email, parent_phone, emergency_contact, address,
      monthly_fee || 0, notes, username, passwordHash, password, student_email ? student_email.trim().toLowerCase() : null,
      status || 'active');

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
    student._plain_password = password;
    if (parent_email) sendWelcomeEmail(student, password).catch(console.error);
    res.status(201).json(student);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already taken, try another' });
    res.status(500).json({ error: err.message });
  }
});

// Bulk import from Excel (parsed on client, array of rows sent here)
router.post('/bulk-import', async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0)
    return res.status(400).json({ error: 'No student data provided' });

  const insert = db.prepare(`
    INSERT OR IGNORE INTO students (name, date_of_birth, level, enrollment_date, parent_name, parent_email,
      parent_phone, emergency_contact, address, monthly_fee, notes, parent_username, parent_password_hash, parent_pin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const results = { created: 0, skipped: 0, errors: [] };
  const insertMany = db.transaction((rows) => {
    for (const s of rows) {
      if (!s.name) { results.errors.push(`Row skipped: missing name`); continue; }
      const username = (s.parent_username || s.name.toLowerCase().replace(/\s+/g, '.') + Math.floor(Math.random() * 900 + 100));
      const password = s.parent_password || Math.random().toString(36).slice(-6).toUpperCase();
      const passwordHash = hashPin(password);
      try {
        const r = insert.run(s.name, s.date_of_birth || null, s.level || 'Beginner',
          s.enrollment_date || new Date().toISOString().split('T')[0],
          s.parent_name || null, s.parent_email || null, s.parent_phone || null,
          s.emergency_contact || null, s.address || null, parseFloat(s.monthly_fee) || 0,
          s.notes || null, username, passwordHash, password);
        if (r.changes > 0) {
          results.created++;
          if (s.parent_email) {
            const student = db.prepare('SELECT * FROM students WHERE id = ?').get(r.lastInsertRowid);
            sendWelcomeEmail(student, password).catch(() => {});
          }
        } else { results.skipped++; }
      } catch (e) { results.skipped++; results.errors.push(`${s.name}: ${e.message}`); }
    }
  });
  insertMany(students);
  res.json(results);
});

// Update student
router.put('/:id', (req, res) => {
  const { name, date_of_birth, level, enrollment_date, parent_name, parent_email,
    parent_phone, emergency_contact, address, monthly_fee, notes, active, parent_username, parent_password, status } = req.body;

  const current = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!current) return res.status(404).json({ error: 'Not found' });

  const passwordHash = parent_password ? hashPin(parent_password) : current.parent_password_hash;
  const pin = parent_password || current.parent_pin;
  const uname = parent_username || current.parent_username;
  const newStatus = status || current.status || 'active';

  db.prepare(`
    UPDATE students SET name=?, date_of_birth=?, level=?, enrollment_date=?, parent_name=?, parent_email=?,
      parent_phone=?, emergency_contact=?, address=?, monthly_fee=?, notes=?, active=?,
      parent_username=?, parent_password_hash=?, parent_pin=?, status=?
    WHERE id=?
  `).run(name, date_of_birth, level, enrollment_date, parent_name, parent_email,
    parent_phone, emergency_contact, address, monthly_fee, notes, active !== undefined ? active : 1,
    uname, passwordHash, pin, newStatus, req.params.id);

  res.json(db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id));
});

// Delete — soft for active students (moves to Left tab), hard for already-left/inactive students
router.delete('/:id', (req, res) => {
  try {
    const student = db.prepare('SELECT status FROM students WHERE id = ?').get(req.params.id);
    if (!student) return res.status(404).json({ error: 'Not found' });
    if (student.status === 'left' || student.status === 'inactive') {
      // Hard delete — null out non-cascading FK references first (whatsapp_logs, email_logs, payments)
      // then let ON DELETE CASCADE handle the rest (attendance, student_classes, etc.)
      db.transaction(() => {
        db.prepare('UPDATE payments SET student_id = NULL WHERE student_id = ?').run(req.params.id);
        db.prepare('UPDATE whatsapp_logs SET student_id = NULL WHERE student_id = ?').run(req.params.id);
        db.prepare('UPDATE email_logs SET student_id = NULL WHERE student_id = ?').run(req.params.id);
        db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
      })();
    } else {
      // Soft delete — move to Left tab
      db.prepare("UPDATE students SET active = 0, status = 'left' WHERE id = ?").run(req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Delete student error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Enroll in class
router.post('/:id/enroll', (req, res) => {
  const { class_id } = req.body;
  try {
    db.prepare(`INSERT OR REPLACE INTO student_classes (student_id, class_id, active) VALUES (?, ?, 1)`).run(req.params.id, class_id);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id/enroll/:classId', (req, res) => {
  db.prepare('UPDATE student_classes SET active = 0 WHERE student_id = ? AND class_id = ?').run(req.params.id, req.params.classId);
  res.json({ success: true });
});

// Get parent login credentials for a student
router.get('/:id/credentials', (req, res) => {
  const s = db.prepare('SELECT name, parent_name, parent_email, parent_username, parent_pin FROM students WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

// Get student portal credentials
router.get('/:id/student-credentials', (req, res) => {
  const s = db.prepare('SELECT name, student_username, student_pin FROM students WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Not found' });
  res.json(s);
});

// Generate / reset student portal credentials
router.post('/:id/student-credentials', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Not found' });

  // Build username: firstname.L + 3-digit number
  const parts = student.name.trim().toLowerCase().split(/\s+/);
  const base = parts[0] + (parts[1] ? '.' + parts[1][0] : '');
  const num = Math.floor(Math.random() * 900 + 100);
  const username = base.replace(/[^a-z.]/g, '') + num;

  // Password: 4 uppercase consonants + 4 digits (easy to read/share)
  const consonants = 'BCDFGHJKLMNPQRSTVWXYZ';
  const digits = '23456789';
  const password =
    Array.from({ length: 4 }, () => consonants[Math.floor(Math.random() * consonants.length)]).join('') +
    Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');

  const hash = hashPin(password);
  db.prepare('UPDATE students SET student_username=?, student_password_hash=?, student_pin=? WHERE id=?')
    .run(username, hash, password, req.params.id);

  res.json({ username, password, student_name: student.name });
});

// ── Activate account (teacher confirms payment) ───────────────
router.post('/:id/activate', async (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  db.prepare('UPDATE students SET account_active=1 WHERE id=?').run(req.params.id);
  const updated = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  // Send activation notification email
  sendActivationEmail(updated).catch(console.error);
  res.json({ success: true, student: updated });
});

// ── Deactivate account ────────────────────────────────────────
router.post('/:id/deactivate', (req, res) => {
  db.prepare('UPDATE students SET account_active=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── Get pending activations ───────────────────────────────────
router.get('/pending/activations', (req, res) => {
  res.json(db.prepare("SELECT * FROM students WHERE account_active=0 AND active=1 AND status='active' ORDER BY created_at DESC").all());
});

// ── Decline / reject a pending activation (remove from system) ─
router.delete('/:id/decline', (req, res) => {
  db.prepare("UPDATE students SET active=0, status='left' WHERE id=?").run(req.params.id);
  res.json({ success: true });
});

// Reset parent password
router.post('/:id/reset-password', (req, res) => {
  const newPass = Math.random().toString(36).slice(-6).toUpperCase();
  const hash = hashPin(newPass);
  db.prepare('UPDATE students SET parent_password_hash=?, parent_pin=? WHERE id=?').run(hash, newPass, req.params.id);
  res.json({ new_password: newPass });
});

module.exports = router;
