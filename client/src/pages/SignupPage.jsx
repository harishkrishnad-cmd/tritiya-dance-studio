/**
 * SignupPage — teacher sends /signup/:token to parents.
 * Uses the same enrollment_links system as EnrollPage but
 * framed as "Create Account" rather than "Student Enrollment".
 */
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Kuchipudi'];

export default function SignupPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);
  const [form, setForm] = useState({
    student_name: '', date_of_birth: '', level: 'Beginner',
    parent_name: '', parent_email: '', parent_phone: '', address: '', notes: '',
  });

  useEffect(() => {
    fetch(`/api/enroll/info/${token}`)
      .then(r => r.json())
      .then(d => { if (d.valid) setInfo(d); else setError(d.error || 'Invalid link'); })
      .catch(() => setError('Unable to load signup form. Please check the link.'));
  }, [token]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/enroll/submit/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      setStep(4);
    } catch { setError('Submission failed. Please try again.'); }
    setLoading(false);
  }

  const font = { fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" };
  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid #e8e8ed', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#f5f5f7', fontFamily: 'inherit' };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 };

  if (error && !info) return (
    <div style={{ ...font, minHeight: '100svh', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Link Not Found</h1>
        <p style={{ fontSize: 14, color: '#86868b', lineHeight: 1.6 }}>{error}</p>
      </div>
    </div>
  );

  if (!info) return (
    <div style={{ ...font, minHeight: '100svh', background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#86868b', fontSize: 14 }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ ...font, minHeight: '100svh', background: '#f5f5f7' }}>
      {/* Header */}
      <div style={{ background: '#1c1c1e', padding: '20px max(20px, calc((100vw - 520px)/2))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🪷</span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{info.school_name}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Parent Sign Up</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 20px' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: step >= s ? '#0071e3' : '#e8e8ed', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Step 1: Student Details */}
        {step === 1 && (
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 4 }}>Student Details</h2>
            <p style={{ fontSize: 13, color: '#86868b', marginBottom: 24 }}>Tell us about the student who will be joining.</p>
            {error && <div style={{ background: '#fff2f0', color: '#ff3b30', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Student Full Name *</label>
              <input style={inputStyle} value={form.student_name} onChange={e => set('student_name', e.target.value)} placeholder="e.g. Ananya Sharma" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Date of Birth</label>
                <input style={inputStyle} type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Level</label>
                <select style={inputStyle} value={form.level} onChange={e => set('level', e.target.value)}>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <button onClick={() => { setError(''); if (!form.student_name.trim()) { setError('Student name is required'); return; } setStep(2); }}
              style={{ width: '100%', padding: '13px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Parent Details */}
        {step === 2 && (
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 4 }}>Your Details</h2>
            <p style={{ fontSize: 13, color: '#86868b', marginBottom: 24 }}>Your login credentials will be sent to this email.</p>
            {error && <div style={{ background: '#fff2f0', color: '#ff3b30', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Your Full Name *</label>
              <input style={inputStyle} value={form.parent_name} onChange={e => set('parent_name', e.target.value)} placeholder="e.g. Priya Sharma" />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Email Address *</label>
              <input style={inputStyle} type="email" value={form.parent_email} onChange={e => set('parent_email', e.target.value)} placeholder="you@example.com" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input style={inputStyle} type="tel" value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label style={labelStyle}>City / Area</label>
                <input style={inputStyle} value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. Nagaram, Hyderabad" />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Notes</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any health conditions, previous training, etc." rows={2} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ padding: '12px 20px', background: '#f5f5f7', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
              <button onClick={() => { setError(''); if (!form.parent_name.trim() || !form.parent_email.trim()) { setError('Name and email are required'); return; } setStep(3); }}
                style={{ flex: 1, padding: '13px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm + Payment */}
        {step === 3 && (
          <div>
            <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', marginBottom: 4 }}>Confirm & Pay</h2>
              <p style={{ fontSize: 13, color: '#86868b', marginBottom: 20 }}>Review your details and complete the first payment.</p>
              <div style={{ background: '#f5f5f7', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#86868b' }}>Student</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{form.student_name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#86868b' }}>Level</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{form.level}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: '#86868b' }}>Your Email</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{form.parent_email}</span>
                </div>
              </div>
              {info.upi_qr_image && (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 4 }}>💳 First Payment via UPI</p>
                  <p style={{ fontSize: 12, color: '#86868b', marginBottom: 12 }}>Scan with PhonePe, Google Pay, Paytm, or any UPI app</p>
                  <img src={info.upi_qr_image} alt="UPI QR" style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 12, border: '1px solid #e8e8ed', padding: 8, background: '#fff', margin: '0 auto', display: 'block' }} />
                </div>
              )}
              {/* UPI AutoPay */}
              <div style={{ background: '#f0f7ff', border: '1px solid #d0e8ff', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0071e3', marginBottom: 2 }}>🔄 Set Up Monthly Auto-Payment</p>
                <p style={{ fontSize: 12, color: '#555', marginBottom: 14, lineHeight: 1.6 }}>
                  Tap your UPI app — it opens with ₹1,000 pre-filled. Set up monthly auto-debit from within the app.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <a href="tez://upi/pay?pa=9398350275@upi&pn=Tritiya+Dance+Studio&am=1000&cu=INR&tn=Monthly+Dance+Fee"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', background: '#fff', border: '2px solid #e8e8ed', borderRadius: 12, textDecoration: 'none', cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#4285F4,#34A853)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>G</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', textAlign: 'center' }}>Google Pay</span>
                    <span style={{ fontSize: 10, color: '#86868b' }}>₹1,000</span>
                  </a>
                  <a href="phonepe://pay?pa=9398350275@upi&pn=Tritiya+Dance+Studio&am=1000&cu=INR&tn=Monthly+Dance+Fee"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', background: '#fff', border: '2px solid #e8e8ed', borderRadius: 12, textDecoration: 'none', cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#5f259f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>P</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', textAlign: 'center' }}>PhonePe</span>
                    <span style={{ fontSize: 10, color: '#86868b' }}>₹1,000</span>
                  </a>
                  <a href="paytmmp://pay?pa=9398350275@upi&pn=Tritiya+Dance+Studio&am=1000&cu=INR&tn=Monthly+Dance+Fee"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', background: '#fff', border: '2px solid #e8e8ed', borderRadius: 12, textDecoration: 'none', cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#00BAF2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>T</div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#1d1d1f', textAlign: 'center' }}>Paytm</span>
                    <span style={{ fontSize: 10, color: '#86868b' }}>₹1,000</span>
                  </a>
                </div>
                <p style={{ fontSize: 11, color: '#86868b', textAlign: 'center', lineHeight: 1.5 }}>
                  Opens the app directly with ₹1,000 pre-filled · UPI: <strong style={{ color: '#333' }}>9398350275@upi</strong>
                </p>
              </div>
              {error && <div style={{ background: '#fff2f0', color: '#ff3b30', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: paid ? '#f0fff4' : '#f5f5f7', border: `1px solid ${paid ? '#34c759' : '#e8e8ed'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 16, cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#34c759', cursor: 'pointer' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: paid ? '#1a7f37' : '#6e6e73' }}>
                  {paid ? '✓ Payment confirmed' : 'I have made the UPI payment above'}
                </span>
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(2)} style={{ padding: '12px 20px', background: '#f5f5f7', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>← Back</button>
                <button onClick={submit} disabled={loading || !paid}
                  style={{ flex: 1, padding: '13px', background: '#34c759', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: paid ? 'pointer' : 'not-allowed', opacity: (loading || !paid) ? 0.5 : 1 }}>
                  {loading ? 'Creating account…' : '✓ Create My Account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div style={{ background: '#fff', borderRadius: 18, padding: 40, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, background: '#f0fff4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 20px' }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', marginBottom: 8 }}>Welcome to {info.school_name}!</h2>
            <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.7, marginBottom: 24 }}>
              Your account has been created. A welcome email with your <strong>Parent Portal login credentials</strong> has been sent to <strong>{form.parent_email}</strong>. Please check your inbox (and spam folder).
            </p>
            <div style={{ background: '#f5f5f7', borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
              <p style={{ fontSize: 13, color: '#86868b', marginBottom: 4 }}>What's next?</p>
              <p style={{ fontSize: 14, color: '#1d1d1f', lineHeight: 1.7 }}>✓ Check your email for login details<br/>✓ Log in to the Parent Portal to track attendance & fees<br/>✓ Your teacher will confirm the class schedule</p>
            </div>
            <a href="/parent" style={{ display: 'inline-block', padding: '12px 28px', background: '#0071e3', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none', marginRight: 12 }}>Go to Parent Portal</a>
            <a href="/" style={{ display: 'inline-block', padding: '12px 28px', background: '#1c1c1e', color: '#fff', borderRadius: 10, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>← Back to Studio</a>
          </div>
        )}
      </div>
    </div>
  );
}
