const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// ── Public: landing page fetches this (no auth) ──────────────
router.get('/public', (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM website_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    const gallery = db.prepare('SELECT id, src, alt, sort_order FROM website_gallery ORDER BY sort_order ASC, id ASC').all();
    res.json({ settings, gallery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: get all settings + gallery ────────────────────────
router.get('/', authMiddleware, adminOnly, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM website_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    const gallery = db.prepare('SELECT id, src, alt, sort_order FROM website_gallery ORDER BY sort_order ASC, id ASC').all();
    res.json({ settings, gallery });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: save settings (bulk key/value) ────────────────────
router.post('/settings', authMiddleware, adminOnly, (req, res) => {
  try {
    const data = req.body;
    const upsert = db.prepare('INSERT OR REPLACE INTO website_settings (key, value) VALUES (?, ?)');
    const tx = db.transaction((obj) => {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') upsert.run(k, v);
      }
    });
    tx(data);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: add gallery image (URL or base64 data URL) ────────
router.post('/gallery', authMiddleware, adminOnly, (req, res) => {
  try {
    const { src, alt } = req.body;
    if (!src) return res.status(400).json({ error: 'src is required' });
    const maxRow = db.prepare('SELECT MAX(sort_order) as m FROM website_gallery').get();
    const order = (maxRow.m != null ? maxRow.m : -1) + 1;
    const result = db.prepare('INSERT INTO website_gallery (src, alt, sort_order) VALUES (?, ?, ?)').run(src, alt || '', order);
    const image = db.prepare('SELECT id, src, alt, sort_order FROM website_gallery WHERE id = ?').get(result.lastInsertRowid);
    res.json(image);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: reorder gallery (MUST be before /:id) ─────────────
router.put('/gallery/reorder', authMiddleware, adminOnly, (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be array' });
    const update = db.prepare('UPDATE website_gallery SET sort_order = ? WHERE id = ?');
    const tx = db.transaction((ids) => { ids.forEach((id, i) => update.run(i, id)); });
    tx(order);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin: update gallery image alt text ─────────────────────
router.put('/gallery/:id', authMiddleware, adminOnly, (req, res) => {
  try {
    const { alt } = req.body;
    db.prepare('UPDATE website_gallery SET alt = ? WHERE id = ?').run(alt || '', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: delete gallery image ───────────────────────────────
router.delete('/gallery/:id', authMiddleware, adminOnly, (req, res) => {
  try {
    db.prepare('DELETE FROM website_gallery WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Testimonials (public GET, admin POST/PUT/DELETE) ──────────

router.get('/testimonials', (req, res) => {
  res.json(db.prepare('SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC').all());
});

router.post('/testimonials', authMiddleware, adminOnly, (req, res) => {
  const { name, role, text, stars, photo } = req.body;
  if (!name || !text) return res.status(400).json({ error: 'name and text required' });
  const maxRow = db.prepare('SELECT MAX(sort_order) as m FROM testimonials').get();
  const order = (maxRow.m != null ? maxRow.m : -1) + 1;
  const r = db.prepare('INSERT INTO testimonials (name, role, text, stars, photo, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(name, role || '', text, stars || 5, photo || '', order);
  res.json(db.prepare('SELECT * FROM testimonials WHERE id=?').get(r.lastInsertRowid));
});

router.put('/testimonials/reorder', authMiddleware, adminOnly, (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be array' });
  const update = db.prepare('UPDATE testimonials SET sort_order=? WHERE id=?');
  const tx = db.transaction((ids) => { ids.forEach((id, i) => update.run(i, id)); });
  tx(order); res.json({ ok: true });
});

router.put('/testimonials/:id', authMiddleware, adminOnly, (req, res) => {
  const { name, role, text, stars, photo } = req.body;
  db.prepare('UPDATE testimonials SET name=?, role=?, text=?, stars=?, photo=? WHERE id=?').run(name, role || '', text, stars || 5, photo || '', req.params.id);
  res.json(db.prepare('SELECT * FROM testimonials WHERE id=?').get(req.params.id));
});

router.delete('/testimonials/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare('DELETE FROM testimonials WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});


module.exports = router;
