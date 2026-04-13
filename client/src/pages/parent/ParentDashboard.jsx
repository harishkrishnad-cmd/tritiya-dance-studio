import React, { useState, useEffect } from 'react';
import { CalendarCheck, CreditCard, BookOpen, User, LogOut, CheckCircle, XCircle, Clock } from 'lucide-react';
import { api } from '../../api';

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-apple-sm transition-all ${active ? 'bg-apple-blue text-white' : 'text-apple-gray-5 hover:bg-apple-gray hover:text-apple-text'}`}
    >
      <Icon size={14}/>{label}
    </button>
  );
}

function AttendanceBadge({ status }) {
  if (status === 'present') return <span className="flex items-center gap-1 text-apple-green text-xs"><CheckCircle size={12}/>Present</span>;
  if (status === 'absent') return <span className="flex items-center gap-1 text-apple-red text-xs"><XCircle size={12}/>Absent</span>;
  return <span className="flex items-center gap-1 text-apple-orange text-xs"><Clock size={12}/>{status}</span>;
}

function RazorpayPayModal({ onClose, studentId, studentName }) {
  const [feeInfo, setFeeInfo] = React.useState(null);
  const [payMode, setPayMode] = React.useState('onetime');
  const [paying, setPaying] = React.useState(false);
  const [done, setDone] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
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
        body: JSON.stringify({ amount: feeAmt, receipt: `fee_p_${studentId}_${Date.now()}`, notes: { student_id: String(studentId) } }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) { setError(order.error || 'Could not create order'); setPaying(false); return; }
      const rzp = new window.Razorpay({
        key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
        name: 'Tritiya Dance Studio', description: 'Monthly Dance Fee',
        prefill: { name: studentName },
        theme: { color: '#0071e3' },
        handler: async (response) => {
          const ver = await fetch('/api/razorpay/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, amount: order.amount, student_id: studentId, description: `Monthly Fee — ${studentName}` }),
          }).then(r => r.json());
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
          const ver = await fetch('/api/razorpay/verify-subscription', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, student_id: studentId, description: `Auto-Pay — ${studentName}` }),
          }).then(r => r.json());
          if (ver.success) setDone('autopay'); else setError(ver.error || 'Verification failed');
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (err) { setError(err.message); setPaying(false); }
  }

  const fee = feeInfo?.fee_amount || '—';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 24px 32px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: '#e8e8ed', borderRadius: 2, margin: '0 auto 20px' }} />

        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{done === 'autopay' ? '🔄' : '✅'}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1d1d1f', marginBottom: 6 }}>
              {done === 'autopay' ? 'Auto-Pay Activated!' : 'Payment Successful!'}
            </h3>
            <p style={{ fontSize: 13, color: '#6e6e73', lineHeight: 1.6, marginBottom: 20 }}>
              {done === 'autopay'
                ? `₹${fee}/month will be automatically debited each month. Cancel anytime via Razorpay.`
                : `₹${fee} received. Your payment has been recorded.`}
            </p>
            <button onClick={onClose} style={{ padding: '11px 28px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: 2 }}>Pay Fees</h3>
            <p style={{ fontSize: 13, color: '#86868b', marginBottom: 16 }}>Monthly fee for {studentName}</p>

            <div style={{ background: '#f5f5f7', borderRadius: 12, padding: '12px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#6e6e73' }}>Amount due</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f' }}>₹{fee}</span>
            </div>

            {/* Mode tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <button onClick={() => setPayMode('onetime')}
                style={{ padding: '12px 8px', borderRadius: 12, border: `2px solid ${payMode === 'onetime' ? '#0071e3' : '#e8e8ed'}`, background: payMode === 'onetime' ? '#f0f6ff' : '#fafafa', cursor: 'pointer', textAlign: 'center' }}>
                <p style={{ fontSize: 20, marginBottom: 4 }}>💳</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: payMode === 'onetime' ? '#0071e3' : '#1d1d1f', margin: 0 }}>Pay Now</p>
                <p style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>One-time · ₹{fee}</p>
              </button>
              <button onClick={() => setPayMode('autopay')}
                style={{ padding: '12px 8px', borderRadius: 12, border: `2px solid ${payMode === 'autopay' ? '#34c759' : '#e8e8ed'}`, background: payMode === 'autopay' ? '#f0fff4' : '#fafafa', cursor: 'pointer', textAlign: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#34c759', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' }}>RECOMMENDED</div>
                <p style={{ fontSize: 20, marginBottom: 4 }}>🔄</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: payMode === 'autopay' ? '#1a7f37' : '#1d1d1f', margin: 0 }}>Auto-Pay</p>
                <p style={{ fontSize: 11, color: '#86868b', marginTop: 2 }}>₹{fee}/month</p>
              </button>
            </div>

            {payMode === 'autopay' && (
              <div style={{ background: '#f0fff4', borderRadius: 10, padding: '9px 13px', marginBottom: 14, fontSize: 12, color: '#1a7f37' }}>
                🔄 Auto-debited every month — no need to pay manually. Cancel anytime.
              </div>
            )}

            {error && <div style={{ background: '#fff2f0', color: '#ff3b30', fontSize: 13, padding: '9px 13px', borderRadius: 8, marginBottom: 12 }}>{error}</div>}

            {payMode === 'onetime' ? (
              <button onClick={handleOneTime} disabled={paying || !feeInfo}
                style={{ width: '100%', padding: '14px', background: paying ? '#86868b' : '#0071e3', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: paying ? 'not-allowed' : 'pointer', marginBottom: 8 }}>
                {paying ? 'Opening Razorpay…' : `💳 Pay ₹${fee} Now`}
              </button>
            ) : (
              <button onClick={handleAutoSub} disabled={paying || !feeInfo}
                style={{ width: '100%', padding: '14px', background: paying ? '#86868b' : '#34c759', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: paying ? 'not-allowed' : 'pointer', marginBottom: 8 }}>
                {paying ? 'Setting up…' : `🔄 Set Up ₹${fee}/month Auto-Pay`}
              </button>
            )}
            <button onClick={onClose} style={{ width: '100%', padding: '11px', background: 'none', border: 'none', fontSize: 14, color: '#86868b', cursor: 'pointer' }}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function ParentDashboard({ studentId, onLogout }) {
  const [tab, setTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [payments, setPayments] = useState(null);
  const [plans, setPlans] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);

  useEffect(() => { api.getParentStudent(studentId).then(setProfile).catch(() => {}); }, [studentId]);

  useEffect(() => {
    if (tab === 'attendance' && !attendance) api.getParentAttendance(studentId).then(setAttendance).catch(() => {});
    if (tab === 'payments' && !payments) api.getParentPayments(studentId).then(setPayments).catch(() => {});
    if (tab === 'plans' && !plans) api.getParentPlans(studentId).then(setPlans).catch(() => {});
  }, [tab, studentId]);

  const schoolName = profile?.school_name || 'Tritiya Dance Studio';

  return (
    <div className="min-h-screen bg-apple-gray">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-apple-gray-2 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-apple-dark rounded-lg flex items-center justify-center text-sm">🪷</div>
            <span className="font-semibold text-apple-text text-sm truncate max-w-[180px]">{schoolName}</span>
          </div>
          <button onClick={onLogout} className="flex items-center gap-1 text-xs text-apple-gray-5 hover:text-apple-red">
            <LogOut size={13}/> Sign out
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Student banner */}
        {profile && (
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-apple-blue to-purple-500 flex items-center justify-center text-white font-semibold text-lg shrink-0">
                {profile.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-apple-text">{profile.name}</p>
                <p className="text-xs text-apple-gray-5">Parent: {profile.parent_name || '—'}</p>
                <p className="text-xs text-apple-gray-5 mt-0.5">
                  {profile.classes?.map(c => c.name).join(', ') || 'No classes assigned'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          <TabBtn active={tab==='profile'} onClick={()=>setTab('profile')} icon={User} label="Profile"/>
          <TabBtn active={tab==='attendance'} onClick={()=>setTab('attendance')} icon={CalendarCheck} label="Attendance"/>
          <TabBtn active={tab==='payments'} onClick={()=>setTab('payments')} icon={CreditCard} label="Fees"/>
          <TabBtn active={tab==='plans'} onClick={()=>setTab('plans')} icon={BookOpen} label="Lessons"/>
        </div>

        {/* Profile tab */}
        {tab === 'profile' && profile && (
          <div className="card space-y-3">
            <h2 className="font-semibold text-sm text-apple-text">Student Details</h2>
            <div className="space-y-2 text-sm">
              {[
                ['Name', profile.name],
                ['Date of Birth', profile.date_of_birth],
                ['Join Date', profile.join_date],
                ['Monthly Fee', profile.monthly_fee ? `₹${profile.monthly_fee}` : '—'],
                ['Parent', profile.parent_name],
                ['Parent Email', profile.parent_email],
                ['Parent Phone', profile.parent_phone],
              ].map(([label, val]) => val ? (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-apple-gray-5">{label}</span>
                  <span className="text-apple-text text-right">{val}</span>
                </div>
              ) : null)}
            </div>
            {profile.classes?.length > 0 && (
              <>
                <div className="border-t border-apple-gray-2 pt-3">
                  <p className="font-semibold text-sm text-apple-text mb-2">Enrolled Classes</p>
                  <div className="space-y-1.5">
                    {profile.classes.map(c => (
                      <div key={c.id} className="bg-apple-gray rounded-apple-sm px-3 py-2 text-sm">
                        <p className="font-medium text-apple-text">{c.name}</p>
                        <p className="text-xs text-apple-gray-5">{c.schedule || 'Schedule TBD'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Attendance tab */}
        {tab === 'attendance' && (
          attendance === null ? (
            <div className="card text-center py-8 text-apple-gray-4 text-sm">Loading…</div>
          ) : (
            <div className="space-y-3">
              {attendance.summary && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Present', val: attendance.summary.present, color: 'text-apple-green' },
                    { label: 'Absent', val: attendance.summary.absent, color: 'text-apple-red' },
                    { label: 'Rate', val: attendance.summary.rate + '%', color: 'text-apple-blue' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="card text-center py-3">
                      <p className={`text-xl font-bold ${color}`}>{val}</p>
                      <p className="text-xs text-apple-gray-5 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="card space-y-1 divide-y divide-apple-gray-2/60">
                {attendance.records?.length === 0 && <p className="text-sm text-apple-gray-4 py-4 text-center">No attendance records yet</p>}
                {attendance.records?.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 px-1 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm text-apple-text">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="text-xs text-apple-gray-5">{r.class_name}</p>
                    </div>
                    <AttendanceBadge status={r.status}/>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Payments tab */}
        {tab === 'payments' && (
          payments === null ? (
            <div className="card text-center py-8 text-apple-gray-4 text-sm">Loading…</div>
          ) : (
            <div className="space-y-3">
              {payments.summary && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Total Paid', val: `₹${payments.summary.paid || 0}`, color: 'text-apple-green' },
                    { label: 'Pending', val: `₹${payments.summary.pending || 0}`, color: 'text-apple-orange' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="card text-center py-3">
                      <p className={`text-xl font-bold ${color}`}>{val}</p>
                      <p className="text-xs text-apple-gray-5 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )}
              {showPayModal && <RazorpayPayModal onClose={() => setShowPayModal(false)} studentId={studentId} studentName={profile?.name || ''} />}
              <button onClick={() => setShowPayModal(true)} className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                💳 Pay Fees Online
              </button>
              <div className="card divide-y divide-apple-gray-2/60">
                {payments.records?.length === 0 && <p className="text-sm text-apple-gray-4 py-4 text-center">No payment records yet</p>}
                {payments.records?.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 px-1 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm text-apple-text">{p.description || 'Monthly Fee'}</p>
                      <p className="text-xs text-apple-gray-5">{p.due_date ? new Date(p.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-apple-text">₹{p.amount}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'paid' ? 'bg-green-50 text-apple-green' : p.status === 'overdue' ? 'bg-red-50 text-apple-red' : 'bg-orange-50 text-apple-orange'}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Lesson Plans tab */}
        {tab === 'plans' && (
          plans === null ? (
            <div className="card text-center py-8 text-apple-gray-4 text-sm">Loading…</div>
          ) : plans.length === 0 ? (
            <div className="card text-center py-8 text-apple-gray-4 text-sm">No upcoming lesson plans</div>
          ) : (
            <div className="space-y-2">
              {plans.map(p => (
                <div key={p.id} className="card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-apple-gray-5 mb-1">
                        {new Date(p.plan_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                        {p.duration_minutes ? ` · ${p.duration_minutes} min` : ''}
                      </p>
                      <p className="font-semibold text-apple-text">{p.subject}</p>
                      {p.topic && <p className="text-sm text-apple-text mt-0.5">{p.topic}</p>}
                      {p.description && <p className="text-xs text-apple-gray-5 mt-1">{p.description}</p>}
                      {p.homework && (
                        <div className="mt-2 bg-amber-50 border border-amber-100 rounded-apple-sm px-2.5 py-1.5">
                          <p className="text-xs font-medium text-amber-700">Homework</p>
                          <p className="text-xs text-amber-600 mt-0.5">{p.homework}</p>
                        </div>
                      )}
                    </div>
                    <span className="text-xs bg-apple-gray text-apple-gray-5 px-2 py-0.5 rounded-full shrink-0">{p.class_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
