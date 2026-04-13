const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// ── COURSES ───────────────────────────────────────────────────

router.get('/courses', authMiddleware, (req, res) => {
  const courses = db.prepare("SELECT * FROM courses WHERE active=1 ORDER BY created_at DESC").all();
  courses.forEach(c => {
    c.materials = db.prepare("SELECT * FROM course_materials WHERE course_id=? ORDER BY sort_order").all(c.id);
    c.quiz = db.prepare("SELECT * FROM quizzes WHERE course_id=?").get(c.id) || null;
    if (c.quiz) {
      c.quiz.questions = db.prepare("SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order").all(c.quiz.id);
      c.quiz.questions.forEach(q => { try { q.options = JSON.parse(q.options); } catch { q.options = []; } });
    }
  });
  res.json(courses);
});

router.post('/courses', authMiddleware, adminOnly, (req, res) => {
  const { title, description, level, thumbnail } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const r = db.prepare("INSERT INTO courses (title,description,level,thumbnail) VALUES (?,?,?,?)").run(title, description || '', level || 'All', thumbnail || '');
  res.json(db.prepare("SELECT * FROM courses WHERE id=?").get(r.lastInsertRowid));
});

router.put('/courses/:id', authMiddleware, adminOnly, (req, res) => {
  const { title, description, level, thumbnail, active } = req.body;
  db.prepare("UPDATE courses SET title=?,description=?,level=?,thumbnail=?,active=? WHERE id=?").run(title, description || '', level || 'All', thumbnail || '', active ?? 1, req.params.id);
  res.json({ ok: true });
});

router.delete('/courses/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare("UPDATE courses SET active=0 WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ── MATERIALS ─────────────────────────────────────────────────

router.post('/courses/:id/materials', authMiddleware, adminOnly, (req, res) => {
  const { title, type, content, duration_minutes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM course_materials WHERE course_id=?").get(req.params.id);
  const order = (maxOrder.m ?? -1) + 1;
  const r = db.prepare("INSERT INTO course_materials (course_id,title,type,content,duration_minutes,sort_order) VALUES (?,?,?,?,?,?)")
    .run(req.params.id, title, type || 'link', content || '', duration_minutes || 0, order);
  res.json(db.prepare("SELECT * FROM course_materials WHERE id=?").get(r.lastInsertRowid));
});

router.put('/materials/:id', authMiddleware, adminOnly, (req, res) => {
  const { title, type, content, duration_minutes, sort_order } = req.body;
  db.prepare("UPDATE course_materials SET title=?,type=?,content=?,duration_minutes=?,sort_order=? WHERE id=?")
    .run(title, type || 'link', content || '', duration_minutes || 0, sort_order ?? 0, req.params.id);
  res.json({ ok: true });
});

router.delete('/materials/:id', authMiddleware, adminOnly, (req, res) => {
  db.prepare("DELETE FROM course_materials WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ── QUIZZES ───────────────────────────────────────────────────

router.post('/courses/:id/quiz', authMiddleware, adminOnly, (req, res) => {
  const { title, pass_score, questions } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  // Delete existing quiz for this course
  const existing = db.prepare("SELECT id FROM quizzes WHERE course_id=?").get(req.params.id);
  if (existing) {
    db.prepare("DELETE FROM quiz_questions WHERE quiz_id=?").run(existing.id);
    db.prepare("DELETE FROM quizzes WHERE id=?").run(existing.id);
  }

  const r = db.prepare("INSERT INTO quizzes (course_id,title,pass_score) VALUES (?,?,?)").run(req.params.id, title, pass_score || 70);
  const quizId = r.lastInsertRowid;

  if (Array.isArray(questions)) {
    const insertQ = db.prepare("INSERT INTO quiz_questions (quiz_id,question,options,correct_index,sort_order) VALUES (?,?,?,?,?)");
    const tx = db.transaction((qs) => { qs.forEach((q, i) => insertQ.run(quizId, q.question, JSON.stringify(q.options), q.correct_index, i)); });
    tx(questions);
  }

  const quiz = db.prepare("SELECT * FROM quizzes WHERE id=?").get(quizId);
  quiz.questions = db.prepare("SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order").all(quizId);
  res.json(quiz);
});

router.get('/quiz/:id', authMiddleware, (req, res) => {
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id=?").get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Not found' });
  quiz.questions = db.prepare("SELECT id,question,options,sort_order FROM quiz_questions WHERE quiz_id=? ORDER BY sort_order").all(req.params.id);
  quiz.questions.forEach(q => { try { q.options = JSON.parse(q.options); } catch { q.options = []; } });
  res.json(quiz);
});

// ── STUDENT PROGRESS ──────────────────────────────────────────

router.post('/progress', authMiddleware, (req, res) => {
  if (!['student','admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { material_id, student_id } = req.body;
  const sid = req.user.role === 'admin' ? student_id : req.user.student_id;
  try {
    db.prepare("INSERT OR IGNORE INTO student_progress (student_id,material_id) VALUES (?,?)").run(sid, material_id);
    // Award points for completing material
    const exists = db.prepare("SELECT id FROM student_points WHERE student_id=? AND reason=?").get(sid, `material_${material_id}`);
    if (!exists) {
      db.prepare("INSERT INTO student_points (student_id,points,reason) VALUES (?,?,?)").run(sid, 5, `material_${material_id}`);
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── QUIZ ATTEMPT ──────────────────────────────────────────────

router.post('/quiz/:id/attempt', authMiddleware, (req, res) => {
  if (!['student','admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  const { answers, student_id } = req.body; // answers: {question_id: selected_index}
  const sid = req.user.role === 'admin' ? student_id : req.user.student_id;

  const quiz = db.prepare("SELECT * FROM quizzes WHERE id=?").get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const questions = db.prepare("SELECT * FROM quiz_questions WHERE quiz_id=?").all(req.params.id);
  if (!questions.length) return res.status(400).json({ error: 'No questions' });

  let correct = 0;
  questions.forEach(q => {
    if (answers && parseInt(answers[q.id]) === q.correct_index) correct++;
  });

  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= quiz.pass_score;

  const r = db.prepare("INSERT INTO quiz_attempts (student_id,quiz_id,score,passed,answers) VALUES (?,?,?,?,?)")
    .run(sid, quiz.id, score, passed ? 1 : 0, JSON.stringify(answers));

  if (passed) {
    // Award points
    db.prepare("INSERT INTO student_points (student_id,points,reason) VALUES (?,?,?)").run(sid, 50, `quiz_${quiz.id}`);
    if (score === 100) db.prepare("INSERT INTO student_points (student_id,points,reason) VALUES (?,?,?)").run(sid, 50, `perfect_${quiz.id}`);

    // Award badge
    const badgeExists = db.prepare("SELECT id FROM student_badges WHERE student_id=? AND badge_data LIKE ?").get(sid, `%quiz_${quiz.id}%`);
    if (!badgeExists) {
      const badgeType = score === 100 ? 'perfect_score' : 'quiz_pass';
      db.prepare("INSERT INTO student_badges (student_id,badge_type,badge_data) VALUES (?,?,?)").run(sid, badgeType, JSON.stringify({ quiz_id: quiz.id, course_id: quiz.course_id, score }));
    }
  }

  const totalPoints = db.prepare("SELECT SUM(points) as t FROM student_points WHERE student_id=?").get(sid);
  res.json({ score, passed, correct, total: questions.length, attempt_id: r.lastInsertRowid, total_points: totalPoints.t || 0 });
});

// ── STUDENT STATS ─────────────────────────────────────────────

router.get('/student/:id/stats', authMiddleware, (req, res) => {
  const sid = req.params.id;
  const progress = db.prepare("SELECT material_id FROM student_progress WHERE student_id=?").all(sid).map(r => r.material_id);
  const attempts = db.prepare("SELECT * FROM quiz_attempts WHERE student_id=? ORDER BY attempted_at DESC").all(sid);
  const badges = db.prepare("SELECT * FROM student_badges WHERE student_id=? ORDER BY earned_at DESC").all(sid);
  const points = db.prepare("SELECT SUM(points) as t FROM student_points WHERE student_id=?").get(sid);
  res.json({ progress, attempts, badges, total_points: points.t || 0 });
});

module.exports = router;
