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
  const [rzpPaying, setRzpPaying] = useState(false);
  const [rzpDone, setRzpDone] = useState(false);
  const [rzpSubPaying, setRzpSubPaying] = useState(false);
  const [rzpSubDone, setRzpSubDone] = useState(false);
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

  // Load Razorpay checkout.js when reaching payment step
  useEffect(() => {
    if (step === 3 && info?.razorpay_key_id && !window.Razorpay) {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.body.appendChild(s);
    }
  }, [step, info]);

  async function handleRazorpayPay() {
    setRzpPaying(true); setError('');
    try {
      const feeAmt = parseFloat(info.fee_amount || '1000');
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: feeAmt, receipt: `signup_${Date.now()}`, notes: { student: form.student_name } }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) { setError(order.error || 'Could not create payment order'); setRzpPaying(false); return; }

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: info.school_name,
        description: 'Monthly Dance Fee',
        prefill: { name: form.parent_name, email: form.parent_email, contact: form.parent_phone },
        theme: { color: '#0071e3' },
        handler: async (response) => {
          const verRes = await fetch('/api/razorpay/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount: order.amount,
              description: `Monthly Dance Fee — ${form.student_name}`,
            }),
          });
          const ver = await verRes.json();
          if (ver.success) { setRzpDone(true); setPaid(true); }
          else setError(ver.error || 'Payment verification failed');
          setRzpPaying(false);
        },
        modal: { ondismiss: () => setRzpPaying(false) },
      });
      rzp.open();
    } catch (err) {
      setError('Payment error: ' + err.message);
      setRzpPaying(false);
    }
  }

  async function handleRazorpaySubscribe() {
    setRzpSubPaying(true); setError('');
    try {
      const subRes = await fetch('/api/razorpay/create-subscription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: { student: form.student_name } }),
      });
      const sub = await subRes.json();
      if (!subRes.ok) { setError(sub.error || 'Could not set up subscription'); setRzpSubPaying(false); return; }

      const rzp = new window.Razorpay({
        key: sub.key_id,
        subscription_id: sub.subscription_id,
        name: info.school_name,
        description: 'Monthly Dance Fee — Auto-Pay',
        prefill: { name: form.parent_name, email: form.parent_email, contact: form.parent_phone },
        theme: { color: '#5856d6' },
        handler: async (response) => {
          const verRes = await fetch('/api/razorpay/verify-subscription', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              description: `Auto-Pay — ${form.student_name}`,
            }),
          });
          const ver = await verRes.json();
          if (ver.success) { setRzpSubDone(true); setPaid(true); }
          else setError(ver.error || 'Subscription verification failed');
          setRzpSubPaying(false);
        },
        modal: { ondismiss: () => setRzpSubPaying(false) },
      });
      rzp.open();
    } catch (err) {
      setError('Subscription error: ' + err.message);
      setRzpSubPaying(false);
    }
  }

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
              {/* Payment Options — Razorpay only */}
              <p style={{ fontSize: 12, fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Choose a payment method</p>

              {/* Option 1: Pay Now (one-time) */}
              <div style={{ border: rzpDone ? '2px solid #34c759' : '1px solid #e8e8ed', borderRadius: 14, padding: 16, marginBottom: 12, background: rzpDone ? '#f0fff4' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: rzpDone ? 0 : 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: rzpDone ? '#d1f5e0' : '#f0f6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{rzpDone ? '✅' : '💳'}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: rzpDone ? '#1a7f37' : '#1d1d1f', margin: 0 }}>
                      {rzpDone ? 'Payment Confirmed!' : 'Pay Now'}
                    </p>
                    <p style={{ fontSize: 11, color: '#86868b', margin: 0 }}>{rzpDone ? `₹${info.fee_amount || 1000} received` : `Cards · UPI · Netbanking · ₹${info.fee_amount || 1000}`}</p>
                  </div>
                </div>
                {!rzpDone && (
                  <button onClick={handleRazorpayPay} disabled={rzpPaying || rzpSubDone}
                    style={{ width: '100%', padding: '12px', background: (rzpPaying || rzpSubDone) ? '#d2d2d7' : '#0071e3', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: (rzpPaying || rzpSubDone) ? 'not-allowed' : 'pointer' }}>
                    {rzpPaying ? 'Opening payment…' : `💳 Pay ₹${info.fee_amount || 1000} Now`}
                  </button>
                )}
              </div>

              {/* Option 2: Auto-Pay Monthly (Razorpay Subscription) */}
              <div style={{ border: rzpSubDone ? '2px solid #34c759' : '2px solid #5856d6', borderRadius: 14, padding: 16, marginBottom: 20, background: rzpSubDone ? '#f0fff4' : '#faf9ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: rzpSubDone ? '#d1f5e0' : '#ece9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{rzpSubDone ? '✅' : '🔄'}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: rzpSubDone ? '#1a7f37' : '#5856d6', margin: 0 }}>
                      {rzpSubDone ? 'Auto-Pay Activated!' : 'Auto-Pay Monthly'} <span style={{ background: rzpSubDone ? '#34c759' : '#5856d6', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, marginLeft: 4, verticalAlign: 'middle' }}>{rzpSubDone ? 'ACTIVE' : 'LIKE NETFLIX'}</span>
                    </p>
                    <p style={{ fontSize: 11, color: '#86868b', margin: 0 }}>
                      {rzpSubDone ? `₹${info.fee_amount || 1000}/month auto-debited — no action needed` : `Authorize once — ₹${info.fee_amount || 1000} auto-debited every month`}
                    </p>
                  </div>
                </div>
                {!rzpSubDone && (
                  <>
                    <p style={{ fontSize: 11, color: '#666', lineHeight: 1.6, margin: '8px 0 12px' }}>
                      Works like Netflix — your bank debits ₹{info.fee_amount || 1000} automatically on the same date each month. Cancel anytime.
                    </p>
                    <button onClick={handleRazorpaySubscribe} disabled={rzpSubPaying || rzpDone}
                      style={{ width: '100%', padding: '12px', background: (rzpSubPaying || rzpDone) ? '#d2d2d7' : '#5856d6', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: (rzpSubPaying || rzpDone) ? 'not-allowed' : 'pointer' }}>
                      {rzpSubPaying ? 'Setting up…' : '🔄 Set Up Auto-Pay'}
                    </button>
                  </>
                )}
              </div>

              {error && <div style={{ background: '#fff2f0', color: '#ff3b30', fontSize: 13, padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

              {/* Payment confirmed indicator */}
              {paid && (
                <div style={{ background: '#f0fff4', border: '1px solid #34c759', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1a7f37' }}>Payment confirmed — you can complete your sign up</span>
                </div>
              )}
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
