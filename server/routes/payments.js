const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendPaymentReminder } = require('../services/emailService');

// List payments with filters
router.get('/', (req, res) => {
  const { student_id, status, month, year } = req.query;
  let query = `
    SELECT p.*, s.name as student_name, s.parent_name, s.parent_email
    FROM payments p JOIN students s ON s.id = p.student_id WHERE 1=1
  `;
  const params = [];
  if (student_id) { query += ` AND p.student_id = ?`; params.push(student_id); }
  if (status) { query += ` AND p.status = ?`; params.push(status); }
  if (month) { query += ` AND strftime('%m', p.due_date) = ?`; params.push(String(month).padStart(2, '0')); }
  if (year) { query += ` AND strftime('%Y', p.due_date) = ?`; params.push(year); }
  query += ` ORDER BY p.due_date DESC`;
  res.json(db.prepare(query).all(...params));
});

// Summary stats
router.get('/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);
  const stats = {
    total_pending: db.prepare(`SELECT COALESCE(SUM(amount),0) as val FROM payments WHERE status IN ('pending','overdue')`).get().val,
    total_overdue: db.prepare(`SELECT COALESCE(SUM(amount),0) as val FROM payments WHERE status='overdue'`).get().val,
    paid_this_month: db.prepare(`SELECT COALESCE(SUM(amount),0) as val FROM payments WHERE status='paid' AND strftime('%Y-%m',paid_date)=?`).get(thisMonth).val,
    pending_count: db.prepare(`SELECT COUNT(*) as val FROM payments WHERE status IN ('pending','overdue')`).get().val,
    overdue_count: db.prepare(`SELECT COUNT(*) as val FROM payments WHERE status='overdue'`).get().val,
  };
  res.json(stats);
});

// Get single payment
router.get('/:id', (req, res) => {
  const payment = db.prepare(`
    SELECT p.*, s.name as student_name, s.parent_name, s.parent_email
    FROM payments p JOIN students s ON s.id = p.student_id WHERE p.id = ?
  `).get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json(payment);
});

// Create payment
router.post('/', (req, res) => {
  const { student_id, amount, due_date, description, payment_method, status } = req.body;
  if (!student_id || !amount || !due_date) return res.status(400).json({ error: 'student_id, amount, due_date required' });
  const result = db.prepare(`
    INSERT INTO payments (student_id, amount, due_date, description, payment_method, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(student_id, amount, due_date, description, payment_method, status || 'pending');
  res.status(201).json(db.prepare(`SELECT p.*, s.name as student_name FROM payments p JOIN students s ON s.id=p.student_id WHERE p.id=?`).get(result.lastInsertRowid));
});

// Update payment (e.g., mark as paid)
router.put('/:id', (req, res) => {
  const { amount, due_date, paid_date, payment_method, description, status } = req.body;
  db.prepare(`
    UPDATE payments SET amount=?, due_date=?, paid_date=?, payment_method=?, description=?, status=?
    WHERE id=?
  `).run(amount, due_date, paid_date, payment_method, description, status, req.params.id);
  res.json(db.prepare(`SELECT p.*, s.name as student_name FROM payments p JOIN students s ON s.id=p.student_id WHERE p.id=?`).get(req.params.id));
});

// Mark as paid
router.post('/:id/mark-paid', (req, res) => {
  const { paid_date, payment_method } = req.body;
  const today = new Date().toISOString().split('T')[0];
  db.prepare(`UPDATE payments SET status='paid', paid_date=?, payment_method=? WHERE id=?`)
    .run(paid_date || today, payment_method || 'cash', req.params.id);
  res.json({ success: true });
});

// Delete payment
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM payments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Bulk create monthly fees for all active students
router.post('/bulk/monthly', (req, res) => {
  const { month, year, due_day } = req.body; // month: 1-12
  if (!month || !year) return res.status(400).json({ error: 'month and year required' });
  const day = due_day || 1;
  const dueDate = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const monthStr = `${year}-${String(month).padStart(2,'0')}`;

  const students = db.prepare('SELECT * FROM students WHERE active = 1 AND monthly_fee > 0').all();
  let created = 0, skipped = 0;
  for (const s of students) {
    const exists = db.prepare(`SELECT id FROM payments WHERE student_id=? AND strftime('%Y-%m',due_date)=?`).get(s.id, monthStr);
    if (exists) { skipped++; continue; }
    db.prepare(`INSERT INTO payments (student_id, amount, due_date, description) VALUES (?, ?, ?, ?)`).run(
      s.id, s.monthly_fee, dueDate, `Monthly fee - ${new Date(dueDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`
    );
    created++;
  }
  res.json({ created, skipped, total: students.length });
});

// Send manual reminder for a payment
router.post('/:id/remind', async (req, res) => {
  const payment = db.prepare(`SELECT p.*, s.name as student_name, s.parent_name, s.parent_email FROM payments p JOIN students s ON s.id=p.student_id WHERE p.id=?`).get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  if (!payment.parent_email) return res.status(400).json({ error: 'No email on file for this student' });

  const student = { id: payment.student_id, name: payment.student_name, parent_name: payment.parent_name, parent_email: payment.parent_email };
  const result = await sendPaymentReminder(payment, student);
  res.json(result);
});

module.exports = router;
