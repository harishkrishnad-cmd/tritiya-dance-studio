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
    parent_username TEXT UNIQUE,
    parent_password_hash TEXT,
    parent_pin TEXT,
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

  CREATE TABLE IF NOT EXISTS lesson_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    plan_date TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT,
    description TEXT,
    homework TEXT,
    duration_minutes INTEGER DEFAULT 90,
    status TEXT DEFAULT 'planned',
    whatsapp_sent INTEGER DEFAULT 0,
    whatsapp_sent_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id),
    lesson_plan_id INTEGER REFERENCES lesson_plans(id),
    phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    sent_via TEXT DEFAULT 'twilio',
    sent_at TEXT DEFAULT (datetime('now'))
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

  CREATE TABLE IF NOT EXISTS website_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS website_gallery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    src TEXT NOT NULL,
    alt TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- OTP tokens for email-based login
  CREATE TABLE IF NOT EXISTS otp_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- Enrollment links sent to parents
  CREATE TABLE IF NOT EXISTS enrollment_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    used INTEGER DEFAULT 0,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- LMS: Courses
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    level TEXT DEFAULT 'All',
    thumbnail TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- LMS: Materials per course
  CREATE TABLE IF NOT EXISTS course_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'link',
    content TEXT,
    duration_minutes INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- LMS: Quizzes per course
  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    pass_score INTEGER DEFAULT 70,
    created_at TEXT DEFAULT (datetime('now'))
  );

  -- LMS: Quiz questions
  CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_index INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  -- LMS: Student material completion
  CREATE TABLE IF NOT EXISTS student_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES course_materials(id) ON DELETE CASCADE,
    completed_at TEXT DEFAULT (datetime('now')),
    UNIQUE(student_id, material_id)
  );

  -- LMS: Quiz attempts
  CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    passed INTEGER DEFAULT 0,
    answers TEXT,
    attempted_at TEXT DEFAULT (datetime('now'))
  );

  -- LMS: Badges earned
  CREATE TABLE IF NOT EXISTS student_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    badge_type TEXT NOT NULL,
    badge_data TEXT,
    earned_at TEXT DEFAULT (datetime('now'))
  );

  -- LMS: Points log
  CREATE TABLE IF NOT EXISTS student_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Run migrations for existing DBs (add new columns if missing)
const cols = db.prepare("PRAGMA table_info(students)").all().map(c => c.name);
if (!cols.includes('parent_username')) db.exec("ALTER TABLE students ADD COLUMN parent_username TEXT");
if (!cols.includes('parent_password_hash')) db.exec("ALTER TABLE students ADD COLUMN parent_password_hash TEXT");
if (!cols.includes('parent_pin')) db.exec("ALTER TABLE students ADD COLUMN parent_pin TEXT");
if (!cols.includes('student_email')) db.exec("ALTER TABLE students ADD COLUMN student_email TEXT");

const upsert = db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`);
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
  ['twilio_account_sid', ''],
  ['twilio_auth_token', ''],
  ['twilio_whatsapp_from', 'whatsapp:+14155238886'],
  ['whatsapp_enabled', 'false'],
];
defaults.forEach(([k, v]) => upsert.run(k, v));

// Website settings defaults
const wupsert = db.prepare(`INSERT OR IGNORE INTO website_settings (key, value) VALUES (?, ?)`);
const webDefaults = [
  ['hero_title', 'Tritiya\nDance Studio'],
  ['hero_subtitle', 'Bharatanatyam · Nagaram, Hyderabad'],
  ['hero_tagline', 'Classical Indian Dance'],
  ['hero_image', 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Bharatanatyam_poses.jpg/1200px-Bharatanatyam_poses.jpg'],
  ['hero_cta1', 'Explore Programs'],
  ['hero_cta2', 'Get in Touch'],
  ['about_heading', 'Where ancient art\nfinds new voice.'],
  ['about_text', 'Tritiya Dance Studio is a classical Bharatanatyam academy rooted in the heart of Nagaram, Hyderabad. Founded and led by Revathi Krishna, the studio is dedicated to preserving the grammar, grace, and devotion of this centuries-old art form.'],
  ['about_text2', 'From young beginners discovering their first steps to advanced students preparing for arangetram, every student receives personalised, rigorous training that honours tradition while nurturing expression.'],
  ['about_badge_name', 'Revathi Krishna'],
  ['about_badge_title', 'Founder & Principal Instructor'],
  ['about_photo', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Bharatanatyam_by_Amrita_Lahiri_%28104%29.jpg/800px-Bharatanatyam_by_Amrita_Lahiri_%28104%29.jpg'],
  ['gallery_heading', 'The art, captured.'],
  ['programs_heading', 'Every stage of the journey.'],
  ['contact_heading', 'Begin your\njourney with us.'],
  ['contact_text', 'Reach out to Revathi Krishna to learn more about our programs, schedule a demo class, or enroll your child.'],
  ['contact_phone', '+91 93983 50275'],
  ['contact_whatsapp', '919398350275'],
  ['contact_address', 'Nagaram, Hyderabad — 500083'],
  ['contact_hours', 'Mon – Sat · 09:30 AM onwards'],
  ['quote_text', '"Dance is the hidden language of the soul."'],
  ['quote_author', '— Martha Graham'],
  ['quote_image', 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/A_Vibrant_Bharatanatyam_Group_Interpretation.jpg/1400px-A_Vibrant_Bharatanatyam_Group_Interpretation.jpg'],
  ['program1_icon', '🌱'], ['program1_level', 'Beginner'], ['program1_title', 'Foundations'],
  ['program1_desc', 'Introduction to Bharatanatyam — Adavus, basic footwork, posture, and the fundamentals of Nritta. Perfect for ages 5 and above.'],
  ['program2_icon', '🌿'], ['program2_level', 'Intermediate'], ['program2_title', 'Classical Training'],
  ['program2_desc', 'Deeper exploration of Abhinaya, Varnam, and Keertanam. Students develop expressional technique and rhythmic precision.'],
  ['program3_icon', '🪷'], ['program3_level', 'Advanced'], ['program3_title', 'Advanced & Arangetram'],
  ['program3_desc', 'Comprehensive preparation for the solo debut performance. Rigorous technique, repertoire building, and stage presence.'],
  ['program4_icon', '🎭'], ['program4_level', 'All Levels'], ['program4_title', 'Kuchipudi'],
  ['program4_desc', 'Classical Kuchipudi training alongside Bharatanatyam, exploring the expressive storytelling traditions of Andhra Pradesh.'],
];
webDefaults.forEach(([k, v]) => wupsert.run(k, v));

module.exports = db;
