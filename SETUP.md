# Bharatanatyam Dance School - Setup Guide

## Step 1: Install Node.js

Download and install Node.js from: https://nodejs.org/en/download
(Choose the "LTS" version - the long-term support one)

After installing, open Terminal and verify:
```
node --version
npm --version
```

## Step 2: Install Dependencies

Open Terminal, navigate to this folder, and run:

```bash
cd ~/bharatanatyam-school

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies
cd client && npm install && cd ..
```

## Step 3: Configure Email (for automatic reminders)

Copy the example env file:
```bash
cp .env.example server/.env
```

Edit `server/.env` with your email credentials.

**For Gmail:**
1. Go to Google Account Settings → Security → 2-Step Verification → App Passwords
2. Generate an App Password for "Mail"
3. Use that 16-character password in `SMTP_PASS`

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourname@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   (your app password)
EMAIL_FROM=Your Dance School <yourname@gmail.com>
```

## Step 4: Start the App

```bash
cd ~/bharatanatyam-school
npm run dev
```

This starts:
- Backend server on http://localhost:3001
- Frontend on http://localhost:5173

Open your browser and go to: **http://localhost:5173**

## Step 5: First-Time Setup in the App

1. Go to **Settings** → Enter your school name, phone, etc.
2. Enter your SMTP email settings and click "Send Test" to verify
3. Enable payment reminders and schedule reminders
4. Go to **Classes** → Add your dance classes
5. Go to **Students** → Add your students and enroll them in classes
6. Go to **Payments** → Click "Generate Monthly Fees" to create fee records

## Features

| Feature | Description |
|---------|-------------|
| 🎓 Students | Add students with parent contact details, dance level, monthly fee |
| 🎵 Classes | Schedule weekly classes, enroll students |
| ✅ Attendance | Mark attendance per class per day, view history |
| 💰 Payments | Record fees, mark as paid, view overdue |
| 📧 Email Reminders | Auto-send payment reminders until paid (every 3 days) |
| 📅 Schedule Reminders | Auto-remind parents the night before class |
| 📊 Dashboard | Overview of today's classes, overdue fees, weekly schedule |

## Running in Production (always-on)

Install PM2 to keep the server running:
```bash
npm install -g pm2
cd ~/bharatanatyam-school
npm run build          # Build the frontend
pm2 start server/index.js --name "dance-school"
pm2 startup            # Auto-start on reboot
pm2 save
```

Access the app at: http://localhost:3001
