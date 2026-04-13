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

// GET /api/razorpay/info — public, returns key_id + fee for student portal
router.get('/info', (req, res) => {
  const s = getSettings();
  res.json({ razorpay_key_id: s.razorpay_key_id || '', fee_amount: s.fee_amount || '1000' });
});

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

// POST /api/razorpay/create-subscription
// Creates (or reuses) a monthly plan and returns a subscription_id for checkout
router.post('/create-subscription', async (req, res) => {
  try {
    const rzp = makeRazorpay();
    if (!rzp) return res.status(400).json({ error: 'Razorpay not configured. Set keys in Settings.' });

    const s = getSettings();
    const feeAmount = Math.round(parseFloat(s.fee_amount || '1000') * 100); // paise

    // Use admin-configured plan ID if present (e.g. one created in Razorpay Dashboard)
    // Only auto-create a plan if no plan ID is configured in Settings
    let planId = s.razorpay_plan_id || '';
    if (!planId) {
      // No plan configured — create one automatically and save for reuse
      const plan = await rzp.instance.plans.create({
        period: 'monthly',
        interval: 1,
        item: {
          name: 'Monthly Dance Fee',
          amount: feeAmount,
          currency: 'INR',
          description: s.school_name || 'Dance Studio Monthly Fee',
        },
      });
      planId = plan.id;
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('razorpay_plan_id', planId);
      console.log(`[Razorpay] Auto-created plan: ${planId}`);
    } else {
      console.log(`[Razorpay] Using configured plan: ${planId}`);
    }

    const subscription = await rzp.instance.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      total_count: 120, // 10 years max — cancel anytime
      notes: req.body.notes || {},
    });

    res.json({ subscription_id: subscription.id, key_id: rzp.key_id });
  } catch (err) {
    res.status(500).json({ error: err.error?.description || err.message || 'Failed to create subscription' });
  }
});

// POST /api/razorpay/verify-subscription
// Verifies the subscription authorization and records the first payment
router.post('/verify-subscription', async (req, res) => {
  const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature, description, student_id, amount } = req.body;

  if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing subscription payment details' });
  }

  const s = getSettings();
  if (!s.razorpay_key_secret) return res.status(400).json({ error: 'Razorpay not configured' });

  // Verify: HMAC-SHA256(payment_id + "|" + subscription_id, key_secret)
  const expected = crypto
    .createHmac('sha256', s.razorpay_key_secret)
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Subscription verification failed — signature mismatch.' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const amountInRupees = amount ? Number(amount) / 100 : parseFloat(s.fee_amount || '1000');
    const r = db.prepare(`
      INSERT INTO payments
        (student_id, amount, due_date, paid_date, payment_method, description, status, razorpay_payment_id, razorpay_subscription_id)
      VALUES (?, ?, ?, ?, 'razorpay_autopay', ?, 'paid', ?, ?)
    `).run(
      student_id || null,
      amountInRupees,
      today,
      today,
      description || 'Auto-Pay Subscription via Razorpay',
      razorpay_payment_id,
      razorpay_subscription_id
    );

    res.json({ success: true, payment_db_id: r.lastInsertRowid, razorpay_payment_id, razorpay_subscription_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
