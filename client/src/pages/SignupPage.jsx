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
              {/* Payment Options */}
              <p style={{ fontSize: 12, fontWeight: 700, color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Choose a payment method</p>

              {/* Razorpay — Pay Online */}
              {info.razorpay_key_id && (
                <div style={{ border: rzpDone ? '2px solid #34c759' : '2px solid #0071e3', borderRadius: 14, padding: 16, marginBottom: 12, background: rzpDone ? '#f0fff4' : '#f0f6ff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: rzpDone ? '#d1f5e0' : '#dceeff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{rzpDone ? '✅' : '💳'}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: rzpDone ? '#1a7f37' : '#0071e3', margin: 0 }}>
                        {rzpDone ? 'Payment Received!' : 'Pay Online'} <span style={{ background: rzpDone ? '#34c759' : '#0071e3', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, marginLeft: 4, verticalAlign: 'middle' }}>{rzpDone ? 'DONE' : 'RECOMMENDED'}</span>
                      </p>
                      <p style={{ fontSize: 11, color: '#86868b', margin: 0 }}>{rzpDone ? `₹${info.fee_amount || 1000} paid via Razorpay` : `Cards · UPI · Netbanking · ₹${info.fee_amount || 1000}`}</p>
                    </div>
                  </div>
                  {!rzpDone && (
                    <button onClick={handleRazorpayPay} disabled={rzpPaying}
                      style={{ width: '100%', padding: '12px', background: rzpPaying ? '#86868b' : '#0071e3', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: rzpPaying ? 'not-allowed' : 'pointer' }}>
                      {rzpPaying ? 'Opening payment…' : `💳 Pay ₹${info.fee_amount || 1000} Now`}
                    </button>
                  )}
                </div>
              )}

              {/* Option 1: Scan QR */}
              {info.upi_qr_image && (
                <div style={{ border: '1px solid #e8e8ed', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📷</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>Option 1 — Scan QR Code</p>
                      <p style={{ fontSize: 11, color: '#86868b', margin: 0 }}>Works with any UPI app</p>
                    </div>
                  </div>
                  <img src={info.upi_qr_image} alt="UPI QR" style={{ width: 160, height: 160, objectFit: 'contain', borderRadius: 10, border: '1px solid #e8e8ed', padding: 6, background: '#fff', margin: '0 auto', display: 'block' }} />
                </div>
              )}

              {/* Option 2: Pay via App */}
              {info.upi_vpa && (
                <div style={{ border: '1px solid #e8e8ed', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📱</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>Option 2 — Pay via App</p>
                      <p style={{ fontSize: 11, color: '#86868b', margin: 0 }}>Opens app with ₹1,000 pre-filled</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Google Pay', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg', logoBg: '#fff', href: `tez://upi/pay?pa=${encodeURIComponent(info.upi_vpa)}&pn=${encodeURIComponent(info.school_name)}&am=1000&cu=INR&tn=Monthly+Dance+Fee` },
                      { label: 'PhonePe',    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg',   logoBg: '#fff', href: `phonepe://pay?pa=${encodeURIComponent(info.upi_vpa)}&pn=${encodeURIComponent(info.school_name)}&am=1000&cu=INR&tn=Monthly+Dance+Fee` },
                      { label: 'Paytm',      logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg', logoBg: '#00BAF2', href: `paytmmp://pay?pa=${encodeURIComponent(info.upi_vpa)}&pn=${encodeURIComponent(info.school_name)}&am=1000&cu=INR&tn=Monthly+Dance+Fee` },
                    ].map(app => (
                      <a key={app.label} href={app.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#f9f9f9', border: '1px solid #e8e8ed', borderRadius: 12, textDecoration: 'none' }}>
                        <div style={{ width: 68, height: 32, background: app.logoBg, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', boxSizing: 'border-box', border: '1px solid #eee', flexShrink: 0 }}>
                          <img src={app.logo} alt={app.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>Pay ₹1,000 with {app.label}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 16, color: '#0071e3' }}>›</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Option 3: Auto-Pay (like Netflix) — display only, no active links */}
              <div style={{ border: '2px solid #d0e8ff', borderRadius: 14, padding: 16, marginBottom: 20, background: '#f8fbff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🔄</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0071e3', margin: 0 }}>Option 3 — Auto-Pay <span style={{ background: '#0071e3', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20, marginLeft: 4, verticalAlign: 'middle' }}>Like Netflix</span></p>
                    <p style={{ fontSize: 11, color: '#86868b', margin: 0 }}>Set once — ₹1,000 auto-debited every month</p>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: '#555', marginBottom: 12, lineHeight: 1.6, marginTop: 8 }}>
                  Pay once and your UPI app auto-debits ₹1,000 every month — no manual payment needed.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Google Pay', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg', logoBg: '#fff' },
                    { label: 'PhonePe',    logo: 'https://upload.wikimedia.org/wikipedia/commons/7/71/PhonePe_Logo.svg',   logoBg: '#fff' },
                    { label: 'Paytm',      logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg', logoBg: '#00BAF2' },
                  ].map(app => (
                    <div key={app.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: '#f0f6ff', border: '1px solid #d0e8ff', borderRadius: 12, opacity: 0.65 }}>
                      <div style={{ width: 68, height: 32, background: app.logoBg, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', boxSizing: 'border-box', border: '1px solid #eee', flexShrink: 0 }}>
                        <img src={app.logo} alt={app.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#86868b' }}>{app.label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: '#86868b', background: '#d0e8ff', padding: '2px 8px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap' }}>Coming soon</span>
                    </div>
                  ))}
                </div>
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
