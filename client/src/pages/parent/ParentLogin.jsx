import React, { useState, useEffect } from 'react';

function useCaptcha() {
  const [captcha, setCaptcha] = useState(null);
  const [answer, setAnswer] = useState('');
  async function refresh() {
    setAnswer('');
    try { const r = await fetch('/api/auth/captcha'); setCaptcha(await r.json()); } catch { setCaptcha(null); }
  }
  useEffect(() => { refresh(); }, []);
  return { captcha, answer, setAnswer, refresh };
}

export default function ParentLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const { captcha, answer, setAnswer, refresh } = useCaptcha();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/parent-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captcha_id: captcha?.captcha_id, captcha_answer: answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.captcha_error) refresh();
        throw new Error(data.error || 'Login failed');
      }
      localStorage.setItem('auth_token', data.token);
      onLogin(data.token, data.student_id);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-apple-gray flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-apple-dark rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-apple">🪷</div>
          <h1 className="text-2xl font-semibold text-apple-text tracking-tight">Parent Portal</h1>
          <p className="text-sm text-apple-gray-5 mt-1">Sign in to view your child's progress</p>
        </div>

        <div className="card shadow-apple-lg">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">Username</label>
              <input className="input" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="your.username" autoCapitalize="none" autoCorrect="off" required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} className="input pr-10" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••" required />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-4 hover:text-apple-gray-5 text-xs">
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* CAPTCHA */}
            {captcha && (
              <div>
                <label className="label">Security Check — What is {captcha.question}?</label>
                <div className="flex gap-2">
                  <input className="input flex-1" type="number" value={answer}
                    onChange={e => setAnswer(e.target.value)} placeholder="Answer" min="0" max="99" />
                  <button type="button" onClick={refresh}
                    className="px-3 py-2 text-xs text-apple-blue border border-apple-gray-2 rounded-apple-sm hover:bg-apple-gray"
                    title="New question">↺</button>
                </div>
              </div>
            )}

            {error && (
              <div className={`text-sm p-3 rounded-apple-sm ${error.includes('not yet activated') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'text-apple-red'}`}>
                {error.includes('not yet activated')
                  ? <><strong>Account Pending</strong><br/>{error}</>
                  : error}
              </div>
            )}

            <button type="submit" disabled={loading || !answer} className="btn-primary w-full flex items-center justify-center gap-2 mt-1">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-apple-gray-4 mt-6">
          Credentials were sent by email when your child enrolled.<br/>
          Contact the school to reset your password.
        </p>
      </div>
    </div>
  );
}
