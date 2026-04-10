require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
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

// Backup / restore
app.use('/api/backup',      require('./routes/backup'));

// Serve React build
const clientBuild = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuild));
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
