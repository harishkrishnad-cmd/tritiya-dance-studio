require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Auth (public)
const { router: authRouter } = require('./routes/auth');
app.use('/api/auth', authRouter);

// Protected routes
const auth = require('./middleware/auth');
app.use('/api/students',  auth, require('./routes/students'));
app.use('/api/classes',   auth, require('./routes/classes'));
app.use('/api/attendance',auth, require('./routes/attendance'));
app.use('/api/payments',  auth, require('./routes/payments'));
app.use('/api/settings',  auth, require('./routes/settings'));

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
