const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../database');

function getSettings() {
  return db.prepare('SELECT key, value FROM settings').all()
    .reduce((a, { key, value }) => ({ ...a, [key]: value }), {});
}

function makeRazorpay() {
  const s = getSettings();
  if (!s.razorpay_key_id || !s.razorpay_key_secret) return null;
  const Razorpay = require('razorpay');
  return { instance: new Razorpay({ key_id: s.razorpay_key_id, key_secret: s.razorpay_key_secret }), key_id: s.razorpay_key_id, key_secret: s.razorpay_key_secret };
}

// POST /api/razorpay/create-order
// Public endpoint — called from enrollment form (no auth token available)
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes = {} } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Valid amount required' });

    const rzp = makeRazorpay();
    if (!rzp) return res.status(400).json({ error: 'Razorpay is not configured. Ask the studio to set up their Razorpay keys in Settings.' });

    const order = await rzp.instance.orders.create({
      amount: Math.round(Number(amount) * 100), // paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes,
    });

    res.json({ order_id: order.id, key_id: rzp.key_id, amount: order.amount, currency: order.currency });
  } catch (err) {
    res.status(500).json({ error: err.error?.description || err.message || 'Failed to create order' });
  }
});

// POST /api/razorpay/verify
// Verifies Razorpay signature and records the payment
router.post('/verify', async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    amount,        // in paise
    description,
    student_id,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment details' });
  }

  const s = getSettings();
  if (!s.razorpay_key_secret) return res.status(400).json({ error: 'Razorpay not configured' });

  // Verify HMAC-SHA256 signature
  const expected = crypto
    .createHmac('sha256', s.razorpay_key_secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed — signature mismatch.' });
  }

  // Record payment in the payments table
  try {
    const today = new Date().toISOString().split('T')[0];
    const amountInRupees = Number(amount) / 100;
    const r = db.prepare(`
      INSERT INTO payments
        (student_id, amount, due_date, paid_date, payment_method, description, status, razorpay_payment_id, razorpay_order_id)
      VALUES (?, ?, ?, ?, 'razorpay', ?, 'paid', ?, ?)
    `).run(
      student_id || null,
      amountInRupees,
      today,
      today,
      description || 'Online Payment via Razorpay',
      razorpay_payment_id,
      razorpay_order_id
    );

    res.json({ success: true, payment_db_id: r.lastInsertRowid, razorpay_payment_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
