require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ── Security headers ──────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ── Global API rate limit (100 req / min per IP) ──────────────
const apiReqCounts = new Map();
setInterval(() => apiReqCounts.clear(), 60 * 1000);
app.use('/api', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const count = (apiReqCounts.get(ip) || 0) + 1;
  apiReqCounts.set(ip, count);
  if (count > 200) return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth (public)
const { router: authRouter } = require('./routes/auth');
app.use('/api/auth', authRouter);

// Middleware
const { authMiddleware, adminOnly } = require('./middleware/auth');

// Admin-only routes
app.use('/api/students',    authMiddleware, require('./routes/students'));
app.use('/api/classes',     authMiddleware, adminOnly, require('./routes/classes'));
app.use('/api/attendance',  authMiddleware, adminOnly, require('./routes/attendance'));
app.use('/api/payments',    authMiddleware, adminOnly, require('./routes/payments'));
app.use('/api/lesson-plans',authMiddleware, require('./routes/lessonPlans'));
app.use('/api/settings',    authMiddleware, adminOnly, require('./routes/settings'));

// Parent portal routes (auth required, but not admin-only)
app.use('/api/parent',      authMiddleware, require('./routes/parent'));

// Website CMS (public GET + admin POST/PUT/DELETE)
app.use('/api/website',     require('./routes/website'));

// Enrollment form (public submit + admin create)
app.use('/api/enroll',       require('./routes/enroll'));

// OTP email login (public)
app.use('/api/otp',         require('./routes/otp'));

// LMS (courses, quizzes, progress)
app.use('/api/lms',         authMiddleware, require('./routes/lms'));

// Razorpay (public — called from enrollment form)
app.use('/api/razorpay',    require('./routes/razorpay'));

// Backup / restore
app.use('/api/backup',      require('./routes/backup'));

// Serve React build
const clientBuild = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuild));

// ── Social/bot crawler middleware — inject real og:image from DB ──
// WhatsApp, Facebook, Telegram etc. send a bot UA and read the HTML <head>.
// Since the React app is client-rendered, they only see index.html which has
// a hardcoded og:image. This middleware intercepts bot requests and returns
// a lightweight HTML page with the correct og:image from the database.
const BOT_UA = /WhatsApp|facebookexternalhit|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Googlebot|bingbot|Applebot/i;
const db = require('./database');

function escAttr(str) { return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

app.get('*', (req, res, next) => {
  if (!BOT_UA.test(req.headers['user-agent'] || '')) return next();
  try {
    const ws = db.prepare('SELECT key,value FROM website_settings').all()
      .reduce((a, r) => { a[r.key] = r.value; return a; }, {});
    const ms = db.prepare("SELECT key,value FROM settings WHERE key IN ('school_name','school_description')").all()
      .reduce((a, r) => { a[r.key] = r.value; return a; }, {});

    const title = escAttr((ws.hero_title || ms.school_name || 'Tritiya Dance Studio').replace(/\n/g, ' '));
    const desc  = escAttr(ws.hero_subtitle || ws.hero_tagline || ms.school_description || 'Classical Bharatanatyam & Kuchipudi training — Nagaram, Hyderabad');

    // Prefer a real URL image; skip base64 (too large / not a valid og:image)
    let img = '';
    for (const key of ['hero_image', 'og_image', 'about_photo', 'quote_image']) {
      const v = ws[key] || '';
      if (v && !v.startsWith('data:')) { img = v; break; }
    }
    if (!img) {
      const row = db.prepare("SELECT src FROM website_gallery WHERE src NOT LIKE 'data:%' ORDER BY sort_order ASC, id ASC LIMIT 1").get();
      if (row) img = row.src;
    }
    if (!img) img = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Bharatanatyam_poses.jpg/1200px-Bharatanatyam_poses.jpg';

    res.send(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"/>
<title>${title}</title>
<meta name="description" content="${desc}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:image" content="${escAttr(img)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${desc}"/>
<meta name="twitter:image" content="${escAttr(img)}"/>
</head><body></body></html>`);
  } catch { next(); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'));
});

// Cron jobs
const { startCronJobs } = require('./services/reminderCron');
startCronJobs();

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🪷  Tritiya Dance Studio running on port ${PORT}\n`);
});
