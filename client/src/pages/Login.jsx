import React, { useState, useEffect } from 'react';

function useCaptcha() {
  const [captcha, setCaptcha] = useState(null);
  const [answer, setAnswer] = useState('');

  async function refresh() {
    setAnswer('');
    try {
      const res = await fetch('/api/auth/captcha');
      setCaptcha(await res.json());
    } catch { setCaptcha(null); }
  }

  useEffect(() => { refresh(); }, []);
  return { captcha, answer, setAnswer, refresh };
}

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { captcha, answer, setAnswer, refresh } = useCaptcha();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captcha_id: captcha?.captcha_id, captcha_answer: answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.captcha_error) refresh();
        throw new Error(data.error || 'Invalid credentials');
      }
      localStorage.setItem('auth_token', data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
      if (!err.message.includes('CAPTCHA')) refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-apple-gray flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-apple-dark rounded-2xl mb-4 shadow-apple-md">
            <span className="text-3xl select-none">🪷</span>
          </div>
          <h1 className="text-2xl font-semibold text-apple-text tracking-tight">Tritiya Dance Studio</h1>
          <p className="text-apple-gray-5 text-sm mt-1">Sign in to your admin panel</p>
        </div>

        <div className="bg-white rounded-apple-lg shadow-apple p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-apple-red text-sm px-4 py-3 rounded-apple-sm flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">User ID</label>
              <input className="input" type="text" value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="Enter your user ID" autoComplete="username" autoFocus />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter your password" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-apple-gray-4 hover:text-apple-gray-5">
                  {showPass
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                </button>
              </div>
            </div>

            {/* CAPTCHA */}
            {captcha && (
              <div>
                <label className="label">Security Check — What is {captcha.question}?</label>
                <div className="flex gap-2">
                  <input className="input flex-1" type="number" value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder="Enter answer" min="0" max="99" />
                  <button type="button" onClick={refresh}
                    className="px-3 py-2 text-xs text-apple-blue border border-apple-gray-2 rounded-apple-sm hover:bg-apple-gray"
                    title="New question">↺</button>
                </div>
              </div>
            )}

            <button type="submit"
              disabled={loading || !username || !password || !answer}
              className="w-full btn-primary py-2.5 mt-1 text-sm font-medium">
              {loading
                ? <span className="flex items-center justify-center gap-2"><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Signing in…</span>
                : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-apple-gray-4 mt-6">
          Tritiya Dance Studio Management System
        </p>
      </div>
    </div>
  );
}
