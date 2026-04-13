import React, { useState, useEffect, useRef } from 'react';

// ── TOKEN UTILS ───────────────────────────────────────────────
function parseToken(t) { try { return JSON.parse(atob(t.split('.')[0])); } catch { return null; } }

// ── LOGIN PAGE (username + password + CAPTCHA) ────────────────
function StudentLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captcha, setCaptcha] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  useEffect(() => { loadCaptcha(); }, []);

  async function loadCaptcha() {
    setCaptchaAnswer('');
    try { const r = await fetch('/api/auth/captcha'); setCaptcha(await r.json()); } catch { setCaptcha(null); }
  }

  async function login() {
    if (!username.trim() || !password.trim() || !captchaAnswer.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password: password.trim(), captcha_id: captcha?.captcha_id, captcha_answer: captchaAnswer }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.captcha_error) loadCaptcha();
        setError(data.error || 'Login failed');
        setLoading(false); return;
      }
      localStorage.setItem('student_token', data.token);
      onLogin(data.token);
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  const inp = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e8e8ed', fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#f5f5f7' };
  const lbl = { fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 };
  const notActivated = error.includes('not yet activated');

  return (
    <div style={{ minHeight: '100svh', background: '#f5f5f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: '#1c1c1e', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>🪷</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.03em' }}>Student Portal</h1>
          <p style={{ fontSize: 14, color: '#86868b', marginTop: 4 }}>Tritiya Dance Studio · Learning Hub</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
          {error && (
            <div style={{ background: notActivated ? '#fff8e1' : '#fff2f0', color: notActivated ? '#7a5a00' : '#ff3b30', fontSize: 13, padding: '12px 14px', borderRadius: 8, marginBottom: 16, border: notActivated ? '1px solid #ffe082' : 'none', lineHeight: 1.5 }}>
              {notActivated ? <><strong>Account Pending Activation</strong><br/>{error}</> : error}
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Username</label>
            <input value={username} onChange={e => { setUsername(e.target.value); setError(''); }} placeholder="e.g. priya.s123"
              onKeyDown={e => e.key === 'Enter' && login()} style={inp} autoCapitalize="none" autoCorrect="off" spellCheck="false" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Password</label>
            <div style={{ position: 'relative' }}>
              <input value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                type={showPass ? 'text' : 'password'} placeholder="Enter your password"
                onKeyDown={e => e.key === 'Enter' && login()}
                style={{ ...inp, paddingRight: 44 }} />
              <button onClick={() => setShowPass(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#86868b', fontSize: 13 }}>
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {captcha && (
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Security Check — Type the characters shown</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <img src={captcha.image_url} alt="CAPTCHA" style={{ height: 48, borderRadius: 8, border: '1px solid #e8e8ed', background: '#f0f0f0' }} />
                <button onClick={loadCaptcha}
                  style={{ padding: '11px 14px', borderRadius: 10, border: '1px solid #e8e8ed', background: '#f5f5f7', cursor: 'pointer', fontSize: 14, color: '#0071e3' }}
                  title="Refresh CAPTCHA">↺</button>
              </div>
              <input value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)}
                type="text" placeholder="Enter characters above" maxLength={5}
                autoComplete="off" autoCorrect="off" spellCheck="false"
                onKeyDown={e => e.key === 'Enter' && login()}
                style={{ ...inp, textTransform: 'uppercase', letterSpacing: '0.15em' }} />
            </div>
          )}
          <button onClick={login} disabled={loading || !username.trim() || !password.trim() || !captchaAnswer.trim()}
            style={{ width: '100%', padding: '13px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: (loading || !username.trim() || !password.trim() || !captchaAnswer.trim()) ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#86868b', marginTop: 20 }}>
          Contact your teacher if you don't have login credentials.
        </p>
      </div>
    </div>
  );
}

// ── CERTIFICATE PAGE ──────────────────────────────────────────
function Certificate({ attempt, courseName, studentName, onBack }) {
  const [certSettings, setCertSettings] = useState({});
  const date = new Date(attempt.attempted_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    fetch('/api/website/public').then(r => r.json()).then(d => {
      if (d.settings) setCertSettings(d.settings);
    }).catch(() => {});
  }, []);

  const borderColor = certSettings.cert_border_color || '#1c1c1e';
  const accentColor = certSettings.cert_accent_color || '#d4af37';
  const certTitle = certSettings.cert_title || 'Certificate of Completion';
  const certSubtitle = certSettings.cert_subtitle || 'Classical Bharatanatyam Dance Studio';
  const instructorName = certSettings.cert_instructor_name || 'Revathi Krishna';
  const instructorTitle = certSettings.cert_instructor_title || 'Principal Instructor';
  const footerText = certSettings.cert_footer_text || 'Tritiya Dance Studio';
  const schoolName = certSettings.school_name || 'Tritiya Dance Studio';

  return (
    <div style={{ minHeight: '100svh', background: '#f5f5f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "-apple-system, BlinkMacSystemFont, Georgia, serif" }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0071e3', fontSize: 14, cursor: 'pointer', marginBottom: 24, alignSelf: 'flex-start' }}>← Back</button>
      <div id="cert" style={{ background: '#fff', maxWidth: 680, width: '100%', borderRadius: 4, padding: '60px 64px', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.12)', border: `8px solid ${borderColor}`, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 12, border: `2px solid ${accentColor}`, borderRadius: 2, pointerEvents: 'none' }} />
        <div style={{ fontSize: 40, marginBottom: 8 }}>🪷</div>
        <p style={{ fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#86868b', marginBottom: 4 }}>{schoolName}</p>
        <p style={{ fontSize: 11, color: '#aaaaaa', marginBottom: 2 }}>{certSubtitle}</p>
        <h1 style={{ fontSize: 36, fontWeight: 300, color: '#1d1d1f', letterSpacing: '-0.01em', margin: '20px 0 8px', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{certTitle}</h1>
        <p style={{ fontSize: 14, color: '#86868b', marginBottom: 28 }}>This is to certify that</p>
        <p style={{ fontSize: 32, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: 12 }}>{studentName}</p>
        <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: 8 }}>has successfully completed the course</p>
        <p style={{ fontSize: 22, fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>{courseName}</p>
        <p style={{ fontSize: 14, color: '#6e6e73', marginBottom: 28 }}>with a score of <strong style={{ color: '#34c759' }}>{attempt.score}%</strong></p>
        <div style={{ width: 80, height: 2, background: accentColor, margin: '0 auto 20px' }} />
        <p style={{ fontSize: 13, color: '#86868b' }}>Awarded on {date}</p>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginTop: 32 }}>{instructorName}</p>
        <p style={{ fontSize: 12, color: '#86868b' }}>{instructorTitle} · {footerText}</p>
      </div>
      <button onClick={() => window.print()}
        style={{ marginTop: 24, padding: '12px 28px', background: '#1c1c1e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        🖨️ Print / Save as PDF
      </button>
      <style>{`@media print { button { display: none !important; } body { background: white; } #cert { box-shadow: none !important; } }`}</style>
    </div>
  );
}

// ── QUIZ PAGE ─────────────────────────────────────────────────
function QuizPage({ quiz, studentId, studentToken, onResult, onBack }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = quiz.questions.every(q => answers[q.id] !== undefined);

  async function submit() {
    setSubmitting(true);
    const res = await fetch(`/api/lms/quiz/${quiz.id}/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ answers, student_id: studentId }),
    });
    const data = await res.json();
    onResult(data);
    setSubmitting(false);
  }

  return (
    <div style={{ minHeight: '100svh', background: '#f5f5f7', fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0071e3', fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>← Back to course</button>
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px', marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 4 }}>{quiz.title}</h1>
          <p style={{ fontSize: 13, color: '#86868b' }}>Pass mark: {quiz.pass_score}% · {quiz.questions.length} questions</p>
        </div>

        {quiz.questions.map((q, qi) => (
          <div key={q.id} style={{ background: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#1d1d1f', marginBottom: 14 }}>Q{qi + 1}. {q.question}</p>
            {q.options.map((opt, oi) => (
              <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 6, background: answers[q.id] === oi ? '#f0f6ff' : '#f9f9f9', border: `1.5px solid ${answers[q.id] === oi ? '#0071e3' : 'transparent'}`, transition: 'all 0.15s' }}>
                <input type="radio" name={`q${q.id}`} checked={answers[q.id] === oi} onChange={() => setAnswers(a => ({ ...a, [q.id]: oi }))}
                  style={{ accentColor: '#0071e3', width: 16, height: 16, flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: '#1d1d1f' }}>{opt}</span>
              </label>
            ))}
          </div>
        ))}

        <button onClick={submit} disabled={!allAnswered || submitting}
          style={{ width: '100%', padding: '14px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: !allAnswered || submitting ? 0.5 : 1, marginTop: 8 }}>
          {submitting ? 'Submitting…' : 'Submit Quiz'}
        </button>
        {!allAnswered && <p style={{ textAlign: 'center', fontSize: 13, color: '#86868b', marginTop: 8 }}>Please answer all questions before submitting.</p>}
      </div>
    </div>
  );
}

// ── COURSE PAGE ───────────────────────────────────────────────
function CoursePage({ course, studentId, studentToken, stats, onBack, onStatsChange }) {
  const [quizResult, setQuizResult] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showCert, setShowCert] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [certAttempt, setCertAttempt] = useState(null);

  const completed = stats.progress || [];
  const allDone = course.materials.length > 0 && course.materials.every(m => completed.includes(m.id));
  const passedAttempt = stats.attempts?.find(a => a.quiz_id === course.quiz?.id && a.passed);

  async function markComplete(matId) {
    await fetch('/api/lms/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` },
      body: JSON.stringify({ material_id: matId, student_id: studentId }),
    });
    onStatsChange();
  }

  async function loadQuiz() {
    const res = await fetch(`/api/lms/quiz/${course.quiz.id}`, { headers: { Authorization: `Bearer ${studentToken}` } });
    const data = await res.json();
    setQuiz(data); setShowQuiz(true);
  }

  function handleQuizResult(result) {
    setQuizResult(result); setShowQuiz(false); onStatsChange();
    if (result.passed) {
      setCertAttempt(result);
      // Auto-show certificate after a short celebration delay
      setTimeout(() => setShowCert(true), 2000);
    }
  }

  function getVideoEmbed(url) {
    if (!url) return null;
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    return null;
  }

  if (showCert && certAttempt) return <Certificate attempt={certAttempt} courseName={course.title} studentName={stats.name || 'Student'} onBack={() => setShowCert(false)} />;
  if (showQuiz && quiz) return <QuizPage quiz={quiz} studentId={studentId} studentToken={studentToken} onResult={handleQuizResult} onBack={() => setShowQuiz(false)} />;

  return (
    <div style={{ minHeight: '100svh', background: '#f5f5f7', fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#0071e3', fontSize: 14, cursor: 'pointer', marginBottom: 16 }}>← My Courses</button>

        <div style={{ background: '#1c1c1e', borderRadius: 16, padding: 24, marginBottom: 16, color: '#fff' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>{course.level}</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8 }}>{course.title}</h1>
          {course.description && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{course.description}</p>}
          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.15)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#34c759', width: course.materials.length ? `${(completed.filter(id => course.materials.find(m => m.id === id)).length / course.materials.length) * 100}%` : '0%', borderRadius: 4, transition: 'width 0.4s' }} />
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>
              {completed.filter(id => course.materials.find(m => m.id === id)).length}/{course.materials.length} done
            </span>
          </div>
        </div>

        {/* Quiz result banner */}
        {quizResult && (
          <div style={{ background: quizResult.passed ? '#f0fff4' : '#fff2f0', border: `1px solid ${quizResult.passed ? '#34c759' : '#ff3b30'}`, borderRadius: 14, padding: '16px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: quizResult.passed ? '#1a7f37' : '#cf1322' }}>{quizResult.passed ? '🎉 Congratulations! You Passed!' : '😔 Not passed'}</p>
              <p style={{ fontSize: 13, color: '#6e6e73', marginTop: 2 }}>Score: {quizResult.score}% · {quizResult.correct}/{quizResult.total} correct</p>
              {quizResult.passed && <p style={{ fontSize: 12, color: '#34c759', marginTop: 4 }}>✨ Opening your certificate…</p>}
            </div>
            {quizResult.passed && <button onClick={() => setShowCert(true)} style={{ padding: '8px 16px', background: '#34c759', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>🏆 View Certificate</button>}
          </div>
        )}

        {/* Materials */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f5f5f7' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>Course Materials</p>
          </div>
          {course.materials.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#86868b', fontSize: 14 }}>Materials coming soon.</div>
          ) : course.materials.map((mat, i) => {
            const isDone = completed.includes(mat.id);
            const icons = { video: '▶️', pdf: '📄', link: '🔗', text: '📝' };
            const embed = mat.type === 'video' ? getVideoEmbed(mat.content) : null;
            return (
              <div key={mat.id} style={{ borderBottom: i < course.materials.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{icons[mat.type] || '📎'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{mat.title}</p>
                    {mat.duration_minutes > 0 && <p style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>{mat.duration_minutes} min</p>}
                  </div>
                  {isDone ? (
                    <span style={{ fontSize: 12, color: '#34c759', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>✓ Done</span>
                  ) : (
                    <button onClick={() => markComplete(mat.id)} style={{ padding: '6px 12px', background: '#f5f5f7', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#1d1d1f' }}>Mark Done</button>
                  )}
                </div>
                {/* Embedded content */}
                {embed && (
                  <div style={{ padding: '0 20px 16px' }}>
                    <div style={{ borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9' }}>
                      <iframe src={embed} width="100%" height="100%" frameBorder="0" allowFullScreen style={{ display: 'block' }} title={mat.title} />
                    </div>
                  </div>
                )}
                {mat.type === 'text' && mat.content && (
                  <div style={{ margin: '0 20px 16px', padding: '14px 16px', background: '#f9f9f9', borderRadius: 10, fontSize: 14, color: '#3d3d3f', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{mat.content}</div>
                )}
                {(mat.type === 'link' || mat.type === 'pdf') && mat.content && (
                  <div style={{ padding: '0 20px 14px' }}>
                    <a href={mat.content} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#0071e3', textDecoration: 'none' }}>Open {mat.type === 'pdf' ? 'Document' : 'Link'} →</a>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quiz section */}
        {course.quiz && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>📝 Course Quiz</p>
            <p style={{ fontSize: 13, color: '#86868b', marginBottom: 14 }}>Pass mark: {course.quiz.pass_score}% · Score ≥ {course.quiz.pass_score}% to earn certificate</p>
            {passedAttempt ? (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setCertAttempt(passedAttempt); setShowCert(true); }} style={{ flex: 1, padding: '12px', background: '#34c759', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>🏆 View Certificate</button>
                <button onClick={loadQuiz} style={{ padding: '12px 20px', background: '#f5f5f7', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>Retry</button>
              </div>
            ) : (
              <button onClick={loadQuiz} disabled={!allDone}
                style={{ width: '100%', padding: '13px', background: allDone ? '#0071e3' : '#e8e8ed', color: allDone ? '#fff' : '#86868b', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: allDone ? 'pointer' : 'not-allowed' }}>
                {allDone ? 'Start Quiz →' : `Complete all ${course.materials.length} materials first`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PAY FEES (existing students) ──────────────────────────────
function PayFees({ studentId, studentName, onClose }) {
  const [feeInfo, setFeeInfo] = useState(null);
  const [payMode, setPayMode] = useState('onetime');
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(null); // null | 'onetime' | 'autopay'
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/razorpay/info').then(r => r.json()).then(setFeeInfo).catch(() => {});
    if (!window.Razorpay) {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(s);
    }
  }, []);

  async function handleOneTime() {
    if (!feeInfo?.razorpay_key_id) { setError('Online payment not configured. Please contact the studio.'); return; }
    setPaying(true); setError('');
    try {
      const feeAmt = parseFloat(feeInfo.fee_amount || '1000');
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: feeAmt, receipt: `fee_${studentId}_${Date.now()}`, notes: { student_id: String(studentId) } }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) { setError(order.error || 'Could not create order'); setPaying(false); return; }

      const rzp = new window.Razorpay({
        key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
        name: 'Tritiya Dance Studio', description: 'Monthly Dance Fee',
        prefill: { name: studentName },
        theme: { color: '#0071e3' },
        handler: async (response) => {
          const verRes = await fetch('/api/razorpay/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: order.amount, student_id: studentId,
              description: `Monthly Fee — ${studentName}`,
            }),
          });
          const ver = await verRes.json();
          if (ver.success) setDone('onetime'); else setError(ver.error || 'Verification failed');
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (err) { setError(err.message); setPaying(false); }
  }

  async function handleAutoSub() {
    if (!feeInfo?.razorpay_key_id) { setError('Online payment not configured. Please contact the studio.'); return; }
    setPaying(true); setError('');
    try {
      const subRes = await fetch('/api/razorpay/create-subscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: { student_id: String(studentId) } }),
      });
      const sub = await subRes.json();
      if (!subRes.ok) { setError(sub.error || 'Could not create subscription'); setPaying(false); return; }

      const rzp = new window.Razorpay({
        key: sub.key_id, subscription_id: sub.subscription_id,
        name: 'Tritiya Dance Studio', description: 'Monthly Dance Fee — Auto-Pay',
        prefill: { name: studentName },
        theme: { color: '#34c759' },
        handler: async (response) => {
          const verRes = await fetch('/api/razorpay/verify-subscription', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              student_id: studentId, description: `Auto-Pay — ${studentName}`,
            }),
          });
          const ver = await verRes.json();
          if (ver.success) setDone('autopay'); else setError(ver.error || 'Verification failed');
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (err) { setError(err.message); setPaying(false); }
  }

  const fee = feeInfo?.fee_amount || '1000';

  return (
    <div style={{ minHeight: '100svh', background: '#f5f5f7', fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      <div style={{ background: '#1c1c1e', padding: '20px max(20px, calc((100vw - 480px)/2))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#0071e3', fontSize: 14, cursor: 'pointer', marginRight: 4 }}>← Back</button>
          <span style={{ fontSize: 20 }}>🪷</span>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Pay Fees</p>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px' }}>
        {done ? (
          <div style={{ background: '#fff', borderRadius: 18, padding: 36, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{done === 'autopay' ? '🔄' : '✅'}</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>
              {done === 'autopay' ? 'Auto-Pay Activated!' : 'Payment Successful!'}
            </h2>
            <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.6, marginBottom: 24 }}>
              {done === 'autopay'
                ? `₹${fee}/month will be automatically debited each month via Razorpay. You can cancel anytime through Razorpay's app or website.`
                : `₹${fee} received. Your payment has been recorded.`}
            </p>
            <button onClick={onClose} style={{ padding: '12px 28px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              ← Back to Dashboard
            </button>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 4 }}>Monthly Dance Fee</h2>
            <p style={{ fontSize: 13, color: '#86868b', marginBottom: 24 }}>Hi {studentName}, choose how you'd like to pay your monthly fee.</p>

            {/* Fee amount banner */}
            <div style={{ background: '#f5f5f7', borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#6e6e73' }}>Monthly Fee</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f' }}>₹{fee}</span>
            </div>

            {/* Mode selector */}
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Payment Method</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setPayMode('onetime')}
                style={{ padding: '16px 10px', borderRadius: 14, border: `2px solid ${payMode === 'onetime' ? '#0071e3' : '#e8e8ed'}`, background: payMode === 'onetime' ? '#f0f6ff' : '#fafafa', cursor: 'pointer', textAlign: 'center' }}>
                <p style={{ fontSize: 24, marginBottom: 6 }}>💳</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: payMode === 'onetime' ? '#0071e3' : '#1d1d1f', margin: '0 0 4px' }}>Pay Now</p>
                <p style={{ fontSize: 11, color: '#86868b' }}>One-time · ₹{fee}</p>
              </button>
              <button onClick={() => setPayMode('autopay')}
                style={{ padding: '16px 10px', borderRadius: 14, border: `2px solid ${payMode === 'autopay' ? '#34c759' : '#e8e8ed'}`, background: payMode === 'autopay' ? '#f0fff4' : '#fafafa', cursor: 'pointer', textAlign: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#34c759', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>RECOMMENDED</div>
                <p style={{ fontSize: 24, marginBottom: 6 }}>🔄</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: payMode === 'autopay' ? '#1a7f37' : '#1d1d1f', margin: '0 0 4px' }}>Auto-Pay</p>
                <p style={{ fontSize: 11, color: '#86868b' }}>₹{fee}/month · like Netflix</p>
              </button>
            </div>

            {payMode === 'autopay' && (
              <div style={{ background: '#f0fff4', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#1a7f37', lineHeight: 1.6 }}>
                🔄 Your card/UPI will be auto-debited ₹{fee} every month. No need to pay manually. Cancel anytime.
              </div>
            )}

            {error && <div style={{ background: '#fff2f0', color: '#ff3b30', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 14 }}>{error}</div>}

            {payMode === 'onetime' ? (
              <button onClick={handleOneTime} disabled={paying || !feeInfo}
                style={{ width: '100%', padding: '14px', background: paying ? '#86868b' : '#0071e3', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: paying ? 'not-allowed' : 'pointer' }}>
                {paying ? 'Opening Razorpay…' : `💳 Pay ₹${fee} Now`}
              </button>
            ) : (
              <button onClick={handleAutoSub} disabled={paying || !feeInfo}
                style={{ width: '100%', padding: '14px', background: paying ? '#86868b' : '#34c759', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: paying ? 'not-allowed' : 'pointer' }}>
                {paying ? 'Setting up Auto-Pay…' : `🔄 Set Up ₹${fee}/month Auto-Pay`}
              </button>
            )}
            <p style={{ fontSize: 11, color: '#86868b', textAlign: 'center', marginTop: 8 }}>Secured by Razorpay · Cards · UPI · Net banking</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── STUDENT DASHBOARD ─────────────────────────────────────────
function StudentDashboard({ studentId, studentName, studentToken, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ progress: [], attempts: [], badges: [], total_points: 0 });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayFees, setShowPayFees] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    const [cRes, sRes] = await Promise.all([
      fetch('/api/lms/courses', { headers: { Authorization: `Bearer ${studentToken}` } }),
      fetch(`/api/lms/student/${studentId}/stats`, { headers: { Authorization: `Bearer ${studentToken}` } }),
    ]);
    const [cData, sData] = await Promise.all([cRes.json(), sRes.json()]);
    setCourses(Array.isArray(cData) ? cData : []);
    setStats({ ...sData, name: studentName });
    setLoading(false);
  }

  const BADGE_INFO = {
    quiz_pass: { icon: '🎯', label: 'Quiz Passer' },
    perfect_score: { icon: '🏆', label: 'Perfect Score' },
  };

  if (loading) return <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#86868b' }}>Loading…</div>;

  if (showPayFees) return <PayFees studentId={studentId} studentName={studentName} onClose={() => setShowPayFees(false)} />;

  if (selected) return (
    <CoursePage course={selected} studentId={studentId} studentToken={studentToken} stats={stats}
      onBack={() => { setSelected(null); loadAll(); }} onStatsChange={loadAll} />
  );

  return (
    <div style={{ minHeight: '100svh', background: '#f5f5f7', fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#1c1c1e', padding: '20px max(20px, calc((100vw - 680px)/2))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>🪷</span>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Tritiya Dance Studio</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Learning Hub</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Hi, {studentName}</p>
            <button onClick={() => setShowPayFees(true)}
              style={{ padding: '7px 14px', background: '#34c759', color: '#fff', border: 'none', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              💳 Pay Fees
            </button>
            <button onClick={onLogout} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Points', value: stats.total_points, icon: '⭐' },
            { label: 'Badges', value: stats.badges.length, icon: '🏅' },
            { label: 'Courses', value: courses.length, icon: '📚' },
          ].map(item => (
            <div key={item.label} style={{ background: '#fff', borderRadius: 14, padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <p style={{ fontSize: 22 }}>{item.icon}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em' }}>{item.value}</p>
              <p style={{ fontSize: 12, color: '#86868b' }}>{item.label}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        {stats.badges.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>Your Badges</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {stats.badges.map((b, i) => {
                const info = BADGE_INFO[b.badge_type] || { icon: '⭐', label: b.badge_type };
                return (
                  <div key={i} style={{ background: '#f9f9f9', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18 }}>{info.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#1d1d1f' }}>{info.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Courses */}
        <p style={{ fontSize: 13, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Available Courses</p>
        {courses.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '40px 20px', textAlign: 'center', color: '#86868b', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📚</p>
            <p style={{ fontSize: 14 }}>No courses available yet. Check back soon!</p>
          </div>
        ) : courses.map(c => {
          const done = (stats.progress || []).filter(id => c.materials.find(m => m.id === id)).length;
          const pct = c.materials.length ? Math.round((done / c.materials.length) * 100) : 0;
          const passed = stats.attempts?.find(a => a.quiz_id === c.quiz?.id && a.passed);
          return (
            <div key={c.id} onClick={() => setSelected(c)}
              style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', marginBottom: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', transition: 'transform 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{c.title}</p>
                  {c.description && <p style={{ fontSize: 13, color: '#86868b', marginTop: 2, lineHeight: 1.5 }}>{c.description}</p>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 12 }}>
                  <span style={{ fontSize: 11, background: '#f5f5f7', color: '#6e6e73', padding: '2px 8px', borderRadius: 10 }}>{c.level}</span>
                  {passed && <span style={{ fontSize: 11, background: '#f0fff4', color: '#34c759', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>✓ Passed</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, background: '#f0f0f5', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: pct === 100 ? '#34c759' : '#0071e3', width: `${pct}%`, borderRadius: 4, transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 12, color: '#86868b', flexShrink: 0 }}>{pct}%</span>
              </div>
              <p style={{ fontSize: 12, color: '#86868b', marginTop: 8 }}>{c.materials.length} materials{c.quiz ? ' · Quiz included' : ''}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ROOT: handles auth state ──────────────────────────────────
export default function StudentPortal() {
  const [token, setToken] = useState(localStorage.getItem('student_token'));
  const payload = token ? parseToken(token) : null;
  const isStudent = payload?.role === 'student';

  function handleLogin(t) { localStorage.setItem('student_token', t); setToken(t); }
  function handleLogout() { localStorage.removeItem('student_token'); setToken(null); }

  if (!token || !isStudent) return <StudentLogin onLogin={handleLogin} />;
  return <StudentDashboard studentId={payload.student_id} studentName={payload.name} studentToken={token} onLogout={handleLogout} />;
}
