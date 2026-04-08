const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'school.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date_of_birth TEXT,
    level TEXT DEFAULT 'Beginner',
    enrollment_date TEXT DEFAULT (date('now')),
    parent_name TEXT,
    parent_email TEXT,
    parent_phone TEXT,
    emergency_contact TEXT,
    address TEXT,
    monthly_fee REAL DEFAULT 0,
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    level TEXT DEFAULT 'All',
    description TEXT,
    max_students INTEGER DEFAULT 20,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS student_classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    enrolled_date TEXT DEFAULT (date('now')),
    active INTEGER DEFAULT 1,
    UNIQUE(student_id, class_id)
  );

  CREATE TABLE IF NOT EXISTS class_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    session_date TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'present',
    notes TEXT,
    UNIQUE(session_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    due_date TEXT NOT NULL,
    paid_date TEXT,
    payment_method TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending',
    reminder_count INTEGER DEFAULT 0,
    last_reminder_sent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS email_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id),
    email_type TEXT,
    subject TEXT,
    recipient_email TEXT,
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    sent_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Insert default settings
const insertSetting = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
const defaults = [
  ['school_name', 'Tritiya Dance Studio'],
  ['school_phone', ''],
  ['school_address', ''],
  ['school_email', ''],
  ['smtp_host', 'smtp.gmail.com'],
  ['smtp_port', '587'],
  ['smtp_secure', 'false'],
  ['smtp_user', ''],
  ['smtp_pass', ''],
  ['email_from', ''],
  ['reminder_interval_days', '3'],
  ['reminder_enabled', 'true'],
  ['schedule_reminder_enabled', 'true'],
  ['schedule_reminder_hours_before', '12'],
  ['currency', '₹'],
  ['payment_due_day', '1'],
];
defaults.forEach(([k, v]) => insertSetting.run(k, v));

module.exports = db;
