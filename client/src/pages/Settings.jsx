import React, { useState, useEffect, useRef } from 'react';
import { Save, Mail, Send, School, Bell, CheckCircle, XCircle, MessageSquare, CreditCard, Image, Download, Upload, Sun, Moon, Lock } from 'lucide-react';
import { api } from '../api';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card space-y-4">
      <h2 className="font-semibold text-sm text-apple-text flex items-center gap-2">
        <Icon size={14} className="text-apple-blue"/>{title}
      </h2>
      {children}
    </div>
  );
}

export default function Settings({ onNameChange }) {
  const [s,setS]=useState({});
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [testEmail,setTestEmail]=useState('');
  const [testResult,setTestResult]=useState(null);
  const [testLoading,setTestLoading]=useState(false);
  const [logs,setLogs]=useState([]);
  const [logsLoaded,setLogsLoaded]=useState(false);
  const [testPhone,setTestPhone]=useState('');
  const [waResult,setWaResult]=useState(null);
  const [waLoading,setWaLoading]=useState(false);
  const [waLogs,setWaLogs]=useState([]);
  const [waLogsLoaded,setWaLogsLoaded]=useState(false);
  const [upiUrlInput, setUpiUrlInput] = useState('');
  const upiFileRef = useRef();
  const logoFileRef = useRef();
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwResult, setPwResult] = useState(null);
  const [restoreResult, setRestoreResult] = useState(null);
  const restoreFileRef = useRef();
  const [smtpProvider, setSmtpProvider] = useState('');
  const [smtpHint, setSmtpHint] = useState('');
  const [etherealLoading, setEtherealLoading] = useState(false);
  const [etherealResult, setEtherealResult] = useState(null);
  const [smtpPassSaved, setSmtpPassSaved] = useState(false);

  useEffect(()=>{
    api.getSettings().then(d=>{
      if (d.smtp_pass === '••••••••') { setSmtpPassSaved(true); d.smtp_pass = ''; }
      if (d.email_api_key === '••••••••') { setSmtpPassSaved(true); d.email_api_key = ''; }
      setS(d); setTestEmail(d.smtp_user||'');
      // Set active provider card
      if (d.email_provider) setSmtpProvider(d.email_provider);
    });
  },[]);

  async function handleEtherealTest() {
    setEtherealLoading(true); setEtherealResult(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/settings/test-ethereal', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
      setEtherealResult(await res.json());
    } catch(e) { setEtherealResult({ success: false, error: e.message }); }
    setEtherealLoading(false);
  }
  function set(key,val){ setS(v=>({...v,[key]:val})); setSaved(false); }

  async function handleBackupDownload() {
    setBackupLoading(true);
    const token = localStorage.getItem('auth_token');
    const res = await fetch('/api/backup', { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tritiya-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupLoading(false);
  }

  function handleRestoreFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm(`Restore from "${file.name}"? This will REPLACE all current data. Are you sure?`)) return;
    setRestoreLoading(true); setRestoreResult(null);
    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: ev.target.result,
        });
        const data = await res.json();
        setRestoreResult(data.success ? { ok: true, msg: 'Restore complete! Refresh the page.' } : { ok: false, msg: data.error });
      } catch(err) { setRestoreResult({ ok: false, msg: err.message }); }
      setRestoreLoading(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleSave() {
    setSaving(true); await api.saveSettings(s); setSaving(false); setSaved(true);
    if(s.school_name) onNameChange?.(s.school_name);
    setTimeout(()=>setSaved(false),3000);
  }
  async function handleTest() {
    if(!testEmail) return alert('Enter an email'); setTestLoading(true); setTestResult(null);
    const r=await api.testEmail(testEmail); setTestResult(r); setTestLoading(false);
  }
  async function handleWaTest() {
    if(!testPhone) return alert('Enter a phone number'); setWaLoading(true); setWaResult(null);
    const r=await api.testWhatsApp(testPhone); setWaResult(r); setWaLoading(false);
  }

  async function handleChangePassword() {
    setPwResult(null);
    if (!pwForm.current || !pwForm.newPw) { setPwResult({ ok: false, msg: 'All fields are required' }); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwResult({ ok: false, msg: 'New passwords do not match' }); return; }
    if (pwForm.newPw.length < 6) { setPwResult({ ok: false, msg: 'New password must be at least 6 characters' }); return; }
    setPwSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/settings/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.newPw }),
      });
      const data = await res.json();
      if (res.ok) { setPwResult({ ok: true, msg: 'Password changed successfully' }); setPwForm({ current: '', newPw: '', confirm: '' }); }
      else setPwResult({ ok: false, msg: data.error });
    } catch (e) { setPwResult({ ok: false, msg: e.message }); }
    setPwSaving(false);
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-apple-text tracking-tight">Settings</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
          {saved ? <><CheckCircle size={13}/>Saved</> : <><Save size={13}/>{saving?'Saving…':'Save'}</>}
        </button>
      </div>

      <Section title="School Information" icon={School}>
        <div className="space-y-3">
          <div><label className="label">School Name</label><input className="input" value={s.school_name||''} onChange={e=>set('school_name',e.target.value)} placeholder="Tritiya Dance Studio"/></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" value={s.school_phone||''} onChange={e=>set('school_phone',e.target.value)} placeholder="+91 XXXXX XXXXX"/></div>
            <div><label className="label">School Email</label><input type="email" className="input" value={s.school_email||''} onChange={e=>set('school_email',e.target.value)} placeholder="school@example.com"/></div>
          </div>
          <div><label className="label">Address</label><textarea className="input" rows={2} value={s.school_address||''} onChange={e=>set('school_address',e.target.value)} placeholder="School address…"/></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Currency Symbol</label><input className="input" value={s.currency||'₹'} onChange={e=>set('currency',e.target.value)}/></div>
            <div><label className="label">Fee Due Day of Month</label><input type="number" min="1" max="28" className="input" value={s.payment_due_day||'1'} onChange={e=>set('payment_due_day',e.target.value)}/></div>
          </div>
        </div>
      </Section>

      <Section title="Email Configuration" icon={Mail}>
        {/* Provider selector */}
        <div>
          <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide mb-2">Step 1 — Choose how to send emails</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'brevo', name: '⭐ Brevo API', tag: 'Recommended · Free 300/day', desc: 'Works on all hosting. Uses HTTPS, no SMTP needed.' },
              { id: 'resend', name: 'Resend API', tag: 'Free 100/day', desc: 'Developer-friendly API. Works on all hosting.' },
              { id: 'smtp', name: 'Custom SMTP', tag: 'Advanced only', desc: 'May be blocked on some hosts (e.g. Render free tier).' },
            ].map(p => (
              <button key={p.id} onClick={() => { set('email_provider', p.id); setSmtpProvider(p.id); setSaved(false); }}
                className={`p-3 rounded-apple-sm border text-left transition-all ${(s.email_provider||'smtp') === p.id ? 'border-apple-blue bg-blue-50' : 'border-apple-gray-2 bg-white hover:border-apple-blue/40'}`}>
                <p className="text-xs font-semibold text-apple-text">{p.name}</p>
                <p className="text-xs text-apple-blue mt-0.5">{p.tag}</p>
                <p className="text-xs text-apple-gray-5 mt-1 leading-snug">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Brevo API config */}
        {(s.email_provider === 'brevo' || (!s.email_provider && smtpProvider === 'brevo')) && (
          <div className="space-y-3 p-3 bg-blue-50 border border-blue-100 rounded-apple-sm">
            <p className="text-xs font-semibold text-apple-text">Brevo API Setup</p>
            <ol className="text-xs text-apple-gray-5 space-y-1 list-decimal pl-4">
              <li>Sign up free at <strong>brevo.com</strong></li>
              <li>Go to <strong>Settings → API Keys → Generate a new API key</strong></li>
              <li>Copy the key (starts with <code className="bg-white px-1 rounded">xkeysib-</code>) and paste below</li>
              <li>Set your From email to any email you verified in Brevo</li>
            </ol>
            <div className="space-y-2">
              <div>
                <label className="label">Brevo API Key</label>
                <input type="password" className="input font-mono text-sm" value={s.email_api_key||''} onChange={e=>{ set('email_api_key',e.target.value); setSmtpPassSaved(false); }} placeholder="xkeysib-…"/>
                {smtpPassSaved && !s.email_api_key && <p className="text-xs text-apple-green mt-1">✓ API key saved. Leave blank to keep it.</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="label">From Name</label>
                  <input className="input" value={s.email_from_name||s.school_name||''} onChange={e=>set('email_from_name',e.target.value)} placeholder="Tritiya Dance Studio"/>
                </div>
                <div>
                  <label className="label">From Email Address</label>
                  <input type="email" className="input" value={s.email_from_address||''} onChange={e=>set('email_from_address',e.target.value)} placeholder="you@yourdomain.com"/>
                  <p className="text-xs text-apple-gray-5 mt-1">Must be verified in Brevo. You can use your Gmail if verified there.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resend API config */}
        {s.email_provider === 'resend' && (
          <div className="space-y-3 p-3 bg-blue-50 border border-blue-100 rounded-apple-sm">
            <p className="text-xs font-semibold text-apple-text">Resend API Setup</p>
            <ol className="text-xs text-apple-gray-5 space-y-1 list-decimal pl-4">
              <li>Sign up free at <strong>resend.com</strong></li>
              <li>Go to <strong>API Keys → Create API Key</strong></li>
              <li>Add your domain or verify an email address under <strong>Domains</strong></li>
              <li>Paste the key below</li>
            </ol>
            <div className="space-y-2">
              <div>
                <label className="label">Resend API Key</label>
                <input type="password" className="input font-mono text-sm" value={s.email_api_key||''} onChange={e=>{ set('email_api_key',e.target.value); setSmtpPassSaved(false); }} placeholder="re_…"/>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="label">From Name</label>
                  <input className="input" value={s.email_from_name||s.school_name||''} onChange={e=>set('email_from_name',e.target.value)} placeholder="Tritiya Dance Studio"/>
                </div>
                <div>
                  <label className="label">From Email Address</label>
                  <input type="email" className="input" value={s.email_from_address||''} onChange={e=>set('email_from_address',e.target.value)} placeholder="you@yourdomain.com"/>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SMTP config */}
        {(s.email_provider === 'smtp' || (!s.email_provider && smtpProvider !== 'brevo' && smtpProvider !== 'resend')) && (
          <div className="space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-apple-sm">
              <p className="text-xs text-yellow-800">⚠️ SMTP may be blocked on Render.com free tier. If test emails time out, switch to Brevo API or Resend API above — they use HTTPS and work everywhere.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label">SMTP Host</label><input className="input" value={s.smtp_host||''} onChange={e=>set('smtp_host',e.target.value)} placeholder="smtp.gmail.com"/></div>
              <div><label className="label">SMTP Port</label><input type="number" className="input" value={s.smtp_port||'587'} onChange={e=>set('smtp_port',e.target.value)}/></div>
              <div><label className="label">Username / Email</label><input type="email" className="input" value={s.smtp_user||''} onChange={e=>set('smtp_user',e.target.value)} placeholder="yourname@example.com"/></div>
              <div>
                <label className="label">Password / SMTP Key</label>
                <input type="password" className="input font-mono" value={s.smtp_pass||''} onChange={e=>{ set('smtp_pass',e.target.value); setSmtpPassSaved(false); }} placeholder={smtpPassSaved ? '•••••••• (saved)' : 'Password or SMTP key'}/>
                {smtpPassSaved && !s.smtp_pass && <p className="text-xs text-apple-green mt-1">✓ Saved. Leave blank to keep it.</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">From Name</label>
                <input className="input" value={s.email_from_name||s.school_name||''} onChange={e=>set('email_from_name',e.target.value)} placeholder="Tritiya Dance Studio"/>
              </div>
              <div>
                <label className="label">From Email Address</label>
                <input type="email" className="input" value={s.email_from_address||''} onChange={e=>set('email_from_address',e.target.value)} placeholder="you@gmail.com"/>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ssl" checked={s.smtp_secure==='true'} onChange={e=>{
                const useSSL = e.target.checked;
                set('smtp_secure', useSSL ? 'true' : 'false');
                if (useSSL && (s.smtp_port === '587' || !s.smtp_port)) set('smtp_port', '465');
                if (!useSSL && s.smtp_port === '465') set('smtp_port', '587');
              }} className="w-4 h-4 accent-apple-blue"/>
              <label htmlFor="ssl" className="text-sm text-apple-text">Use SSL/TLS (port 465) — <span className="text-apple-gray-5 text-xs">leave unchecked for Gmail, Brevo SMTP, Zoho</span></label>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-apple-gray-2 space-y-3">
          <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide">Step 2 — Test your configuration</p>

          {/* Real SMTP test */}
          <div className="space-y-2">
            <p className="text-xs text-apple-gray-5">Send via your configured SMTP:</p>
            <div className="flex gap-2">
              <input type="email" className="input flex-1" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="Send test to your inbox…"/>
              <button onClick={handleTest} disabled={testLoading} className="btn-secondary flex items-center gap-1.5 whitespace-nowrap text-sm"><Send size={13}/>{testLoading?'Sending…':'Send Test'}</button>
            </div>
            {testResult&&(
              <div className={`flex items-start gap-1.5 text-sm ${testResult.success?'text-apple-green':'text-apple-red'}`}>
                {testResult.success?<CheckCircle size={14} className="mt-0.5 flex-shrink-0"/>:<XCircle size={14} className="mt-0.5 flex-shrink-0"/>}
                <span>{testResult.success ? 'Email sent successfully! Check your inbox.' : 'Failed: ' + testResult.error}</span>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section title="WhatsApp Notifications" icon={MessageSquare}>
        <p className="text-xs text-apple-gray-5">Uses <strong>Twilio WhatsApp API</strong>. Set up at <span className="font-mono">twilio.com</span> — use the WhatsApp Sandbox for testing.</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-apple-gray rounded-apple-sm p-3">
            <input type="checkbox" id="wa_en" checked={s.whatsapp_enabled==='true'} onChange={e=>set('whatsapp_enabled',e.target.checked?'true':'false')} className="mt-0.5 w-4 h-4 accent-apple-blue"/>
            <label htmlFor="wa_en" className="text-sm font-medium text-apple-text cursor-pointer">Enable WhatsApp notifications</label>
          </div>
          {s.whatsapp_enabled==='true'&&(
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label">Twilio Account SID</label><input className="input font-mono text-sm" value={s.twilio_account_sid||''} onChange={e=>set('twilio_account_sid',e.target.value)} placeholder="ACxxxxxxxxxxxxxxxx"/></div>
                <div><label className="label">Auth Token</label><input type="password" className="input" value={s.twilio_auth_token||''} onChange={e=>set('twilio_auth_token',e.target.value)} placeholder="Auth token"/></div>
              </div>
              <div><label className="label">WhatsApp From Number</label><input className="input" value={s.twilio_whatsapp_from||''} onChange={e=>set('twilio_whatsapp_from',e.target.value)} placeholder="+14155238886 (Twilio sandbox number)"/></div>
              <div className="pt-2 border-t border-apple-gray-2 space-y-2">
                <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide">Test Connection</p>
                <div className="flex gap-2">
                  <input type="tel" className="input flex-1" value={testPhone} onChange={e=>setTestPhone(e.target.value)} placeholder="+91 XXXXXXXXXX"/>
                  <button onClick={handleWaTest} disabled={waLoading} className="btn-secondary flex items-center gap-1.5 whitespace-nowrap text-sm"><Send size={13}/>{waLoading?'Sending…':'Send Test'}</button>
                </div>
                {waResult&&(
                  <div className={`flex items-center gap-1.5 text-sm ${waResult.success?'text-apple-green':'text-apple-red'}`}>
                    {waResult.success?<CheckCircle size={14}/>:<XCircle size={14}/>}
                    {waResult.success?'WhatsApp sent!':'Failed: '+waResult.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Studio Logo" icon={Image}>
        <p className="text-xs text-apple-gray-4">Upload your studio logo — shown in the website header, emails, and student portal.</p>
        {s.logo_image && (
          <div className="flex items-start gap-3">
            <img src={s.logo_image} alt="Studio Logo" className="h-16 object-contain border border-apple-gray-2 rounded-apple-sm bg-white p-2" />
            <button onClick={() => set('logo_image', '')} className="text-xs text-apple-red hover:underline mt-1">Remove</button>
          </div>
        )}
        <div>
          <label className="label">Upload Logo</label>
          <input type="file" accept="image/*" ref={logoFileRef} style={{display:'none'}} onChange={e => {
            const file = e.target.files[0]; if(!file) return;
            const reader = new FileReader();
            reader.onload = ev => set('logo_image', ev.target.result);
            reader.readAsDataURL(file);
          }} />
          <button className="btn-secondary text-xs" onClick={() => logoFileRef.current.click()}>📁 Choose Logo Image</button>
          <p className="text-xs text-apple-gray-5 mt-1">PNG or SVG with transparent background works best. Max ~500KB.</p>
        </div>
      </Section>

      <Section title="Website Theme" icon={Sun}>
        <p className="text-xs text-apple-gray-4">Choose the colour theme for your public landing page.</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'dark', label: 'Dark', icon: '🌙', desc: 'Deep black — premium look (default)' },
            { id: 'light', label: 'Light', icon: '☀️', desc: 'Clean white — bright and airy' },
          ].map(t => (
            <button key={t.id} onClick={() => set('site_theme', t.id)}
              className={`p-4 rounded-apple-sm border text-left transition-all ${(s.site_theme || 'dark') === t.id ? 'border-apple-blue bg-blue-50' : 'border-apple-gray-2 bg-white hover:border-apple-blue/40'}`}>
              <p className="text-xl mb-1">{t.icon}</p>
              <p className="text-sm font-semibold text-apple-text">{t.label}</p>
              <p className="text-xs text-apple-gray-5 mt-0.5">{t.desc}</p>
              {t.id === 'dark' && <span className="text-xs text-apple-blue font-medium">Default</span>}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Razorpay Online Payments" icon={CreditCard}>
        <p className="text-xs text-apple-gray-4">Accept online card / UPI / netbanking payments via Razorpay. Get your API keys from <strong>razorpay.com → Settings → API Keys</strong>.</p>
        <div>
          <label className="label">Razorpay Key ID</label>
          <input className="input" value={s.razorpay_key_id||''} onChange={e=>set('razorpay_key_id',e.target.value)} placeholder="rzp_live_... or rzp_test_..." />
          <p className="text-xs text-apple-gray-4 mt-1">Starts with <code>rzp_live_</code> for production or <code>rzp_test_</code> for testing.</p>
        </div>
        <div>
          <label className="label">Razorpay Key Secret</label>
          <input className="input" type="password" value={s.razorpay_key_secret||''} onChange={e=>set('razorpay_key_secret',e.target.value)} placeholder="Enter key secret (saved securely)" />
          <p className="text-xs text-apple-gray-4 mt-1">Never share this. Stored securely and never displayed again once saved.</p>
        </div>
        <div>
          <label className="label">Monthly Fee Amount (₹)</label>
          <input className="input" type="number" value={s.fee_amount||'1000'} onChange={e=>set('fee_amount',e.target.value)} placeholder="1000" />
          <p className="text-xs text-apple-gray-4 mt-1">This amount is shown on the enrollment form Pay Online button.</p>
        </div>
      </Section>

      <Section title="Payment UPI QR Code" icon={CreditCard}>
        <p className="text-xs text-apple-gray-4">Upload your UPI QR code — it will appear in welcome emails and payment reminders.</p>
        <div>
          <label className="label">UPI VPA / Payment Address</label>
          <input className="input" value={s.upi_vpa||''} onChange={e=>set('upi_vpa',e.target.value)}
            placeholder="e.g. 9398350275@ybl or name@okaxis" />
          <p className="text-xs text-apple-gray-4 mt-1">Open any UPI app → Profile → copy your UPI ID (e.g. 9398350275@ybl). Used for the GPay/PhonePe/Paytm buttons on the enrollment form.</p>
        </div>
        {s.upi_qr_image && (
          <div className="flex items-start gap-3">
            <img src={s.upi_qr_image} alt="UPI QR" className="w-32 h-32 object-contain border border-apple-gray-2 rounded-apple-sm bg-white p-2" />
            <button onClick={() => set('upi_qr_image', '')} className="text-xs text-apple-red hover:underline mt-1">Remove</button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Paste Image URL</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="https://..." value={upiUrlInput} onChange={e => setUpiUrlInput(e.target.value)} />
              <button className="btn-secondary text-xs" onClick={() => { if(upiUrlInput.trim()) { set('upi_qr_image', upiUrlInput.trim()); setUpiUrlInput(''); } }}>Set</button>
            </div>
          </div>
          <div>
            <label className="label">Upload from Device</label>
            <input type="file" accept="image/*" ref={upiFileRef} style={{display:'none'}} onChange={e => {
              const file = e.target.files[0]; if(!file) return;
              const reader = new FileReader();
              reader.onload = ev => set('upi_qr_image', ev.target.result);
              reader.readAsDataURL(file);
            }} />
            <button className="btn-secondary w-full text-xs" onClick={() => upiFileRef.current.click()}>📁 Choose Image</button>
          </div>
        </div>
      </Section>

      <Section title="Automated Reminders" icon={Bell}>
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-apple-gray rounded-apple-sm p-3">
            <input type="checkbox" id="pay_rem" checked={s.reminder_enabled==='true'} onChange={e=>set('reminder_enabled',e.target.checked?'true':'false')} className="mt-0.5 w-4 h-4 accent-apple-blue"/>
            <div>
              <label htmlFor="pay_rem" className="text-sm font-medium text-apple-text cursor-pointer">Payment Reminders</label>
              <p className="text-xs text-apple-gray-5 mt-0.5">Emails parents when fees are due/overdue, repeatedly until paid (runs 9 AM daily)</p>
            </div>
          </div>
          {s.reminder_enabled==='true'&&(
            <div className="pl-7">
              <label className="label">Interval between reminders</label>
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="30" className="input w-20" value={s.reminder_interval_days||'3'} onChange={e=>set('reminder_interval_days',e.target.value)}/>
                <span className="text-sm text-apple-gray-5">days</span>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 bg-apple-gray rounded-apple-sm p-3">
            <input type="checkbox" id="sch_rem" checked={s.schedule_reminder_enabled==='true'} onChange={e=>set('schedule_reminder_enabled',e.target.checked?'true':'false')} className="mt-0.5 w-4 h-4 accent-apple-blue"/>
            <div>
              <label htmlFor="sch_rem" className="text-sm font-medium text-apple-text cursor-pointer">Class Schedule Reminders</label>
              <p className="text-xs text-apple-gray-5 mt-0.5">Emails parents the evening before their child's class (runs 6 PM daily)</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Email Logs" icon={Mail}>
        {!logsLoaded ? (
          <button onClick={async()=>{ setLogs(await api.getEmailLogs()); setLogsLoaded(true); }} className="btn-secondary text-sm">Load Logs</button>
        ) : logs.length===0 ? <p className="text-sm text-apple-gray-4">No emails sent yet</p> : (
          <div className="overflow-hidden rounded-apple-sm border border-apple-gray-2">
            <table className="w-full text-xs">
              <thead><tr className="bg-apple-gray border-b border-apple-gray-2">
                {['Time','Type','Recipient','Status'].map(h=><th key={h} className="text-left px-3 py-2 text-apple-gray-5 font-semibold uppercase tracking-wide text-[10px]">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-apple-gray-2/60">
                {logs.map(l=>(
                  <tr key={l.id} className="hover:bg-apple-gray/40">
                    <td className="px-3 py-2 text-apple-gray-5">{new Date(l.sent_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                    <td className="px-3 py-2 text-apple-gray-5 capitalize">{(l.email_type||'').replace(/_/g,' ')}</td>
                    <td className="px-3 py-2 text-apple-gray-5 truncate max-w-[160px]">{l.student_name||'—'}</td>
                    <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded-full font-medium ${l.status==='sent'?'bg-green-50 text-apple-green':'bg-red-50 text-apple-red'}`}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="WhatsApp Logs" icon={MessageSquare}>
        {!waLogsLoaded ? (
          <button onClick={async()=>{ setWaLogs(await api.getWhatsAppLogs()); setWaLogsLoaded(true); }} className="btn-secondary text-sm">Load Logs</button>
        ) : waLogs.length===0 ? <p className="text-sm text-apple-gray-4">No WhatsApp messages sent yet</p> : (
          <div className="overflow-hidden rounded-apple-sm border border-apple-gray-2">
            <table className="w-full text-xs">
              <thead><tr className="bg-apple-gray border-b border-apple-gray-2">
                {['Time','Recipient','Phone','Status'].map(h=><th key={h} className="text-left px-3 py-2 text-apple-gray-5 font-semibold uppercase tracking-wide text-[10px]">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-apple-gray-2/60">
                {waLogs.map(l=>(
                  <tr key={l.id} className="hover:bg-apple-gray/40">
                    <td className="px-3 py-2 text-apple-gray-5">{new Date(l.sent_at).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                    <td className="px-3 py-2 text-apple-gray-5">{l.student_name||'—'}</td>
                    <td className="px-3 py-2 text-apple-gray-5 font-mono">{l.to_phone||'—'}</td>
                    <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded-full font-medium ${l.status==='sent'?'bg-green-50 text-apple-green':'bg-red-50 text-apple-red'}`}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Certificate Template" icon={Save}>
        <p className="text-xs text-apple-gray-4">Customise the certificate shown to students when they pass a course quiz. Changes are saved with the main Save button.</p>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Certificate Title</label><input className="input" value={s.cert_title||'Certificate of Completion'} onChange={e=>set('cert_title',e.target.value)} placeholder="Certificate of Completion"/></div>
            <div><label className="label">Studio Subtitle</label><input className="input" value={s.cert_subtitle||''} onChange={e=>set('cert_subtitle',e.target.value)} placeholder="Classical Bharatanatyam Dance Studio"/></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Instructor Name</label><input className="input" value={s.cert_instructor_name||''} onChange={e=>set('cert_instructor_name',e.target.value)} placeholder="Revathi Krishna"/></div>
            <div><label className="label">Instructor Title</label><input className="input" value={s.cert_instructor_title||''} onChange={e=>set('cert_instructor_title',e.target.value)} placeholder="Founder & Principal Instructor"/></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">Border Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={s.cert_border_color||'#1c1c1e'} onChange={e=>set('cert_border_color',e.target.value)} className="w-10 h-9 p-1 rounded border border-apple-gray-2 cursor-pointer"/>
                <input className="input flex-1" value={s.cert_border_color||'#1c1c1e'} onChange={e=>set('cert_border_color',e.target.value)} placeholder="#1c1c1e"/>
              </div>
            </div>
            <div><label className="label">Accent / Gold Color</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={s.cert_accent_color||'#d4af37'} onChange={e=>set('cert_accent_color',e.target.value)} className="w-10 h-9 p-1 rounded border border-apple-gray-2 cursor-pointer"/>
                <input className="input flex-1" value={s.cert_accent_color||'#d4af37'} onChange={e=>set('cert_accent_color',e.target.value)} placeholder="#d4af37"/>
              </div>
            </div>
          </div>
          <div><label className="label">Footer Text</label><input className="input" value={s.cert_footer_text||''} onChange={e=>set('cert_footer_text',e.target.value)} placeholder="Tritiya Dance Studio · Nagaram, Hyderabad"/></div>
          <div className="p-3 bg-apple-gray rounded-apple-sm">
            <p className="text-xs font-medium text-apple-gray-5 mb-2">Preview (approximate)</p>
            <div style={{background:'#fff',border:`4px solid ${s.cert_border_color||'#1c1c1e'}`,borderRadius:4,padding:'20px 24px',textAlign:'center',position:'relative',maxWidth:360,margin:'0 auto'}}>
              <div style={{position:'absolute',inset:6,border:`1.5px solid ${s.cert_accent_color||'#d4af37'}`,borderRadius:2,pointerEvents:'none'}}/>
              <div style={{fontSize:22,marginBottom:4}}>🪷</div>
              <p style={{fontSize:8,letterSpacing:'0.2em',textTransform:'uppercase',color:'#86868b',marginBottom:2}}>{s.cert_subtitle||'Classical Bharatanatyam Dance Studio'}</p>
              <p style={{fontSize:13,fontStyle:'italic',fontFamily:'Georgia,serif',color:'#1d1d1f',margin:'8px 0 4px'}}>{s.cert_title||'Certificate of Completion'}</p>
              <p style={{fontSize:11,color:'#1d1d1f',fontWeight:700,margin:'4px 0'}}>Student Name</p>
              <div style={{width:40,height:1,background:s.cert_accent_color||'#d4af37',margin:'6px auto'}}/>
              <p style={{fontSize:8,color:'#86868b'}}>{s.cert_instructor_name||'Revathi Krishna'} · {s.cert_instructor_title||'Founder & Principal Instructor'}</p>
              <p style={{fontSize:7,color:'#86868b',marginTop:4}}>{s.cert_footer_text||'Tritiya Dance Studio'}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Admin Password" icon={Lock}>
        <p className="text-xs text-apple-gray-4">Change the admin login password. You'll need to enter the current password to confirm.</p>
        <div className="space-y-3">
          <div><label className="label">Current Password</label><input type="password" className="input" value={pwForm.current} onChange={e=>setPwForm(v=>({...v,current:e.target.value}))} placeholder="Enter current password" autoComplete="current-password"/></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">New Password</label><input type="password" className="input" value={pwForm.newPw} onChange={e=>setPwForm(v=>({...v,newPw:e.target.value}))} placeholder="Min 6 characters" autoComplete="new-password"/></div>
            <div><label className="label">Confirm New Password</label><input type="password" className="input" value={pwForm.confirm} onChange={e=>setPwForm(v=>({...v,confirm:e.target.value}))} placeholder="Repeat new password" autoComplete="new-password"/></div>
          </div>
          <button onClick={handleChangePassword} disabled={pwSaving} className="btn-primary flex items-center gap-1.5">
            <Lock size={13}/>{pwSaving ? 'Saving…' : 'Change Password'}
          </button>
          {pwResult && (
            <div className={`flex items-center gap-2 text-sm ${pwResult.ok ? 'text-apple-green' : 'text-apple-red'}`}>
              {pwResult.ok ? <CheckCircle size={14}/> : <XCircle size={14}/>}
              {pwResult.msg}
            </div>
          )}
        </div>
      </Section>

      <Section title="Backup & Restore" icon={Download}>
        <p className="text-xs text-apple-gray-4">
          Download a full backup of all your data (students, payments, settings, website content) as a JSON file.
          Restore it any time — useful before deploying updates or if data is accidentally lost.
        </p>
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-apple-sm">
          <p className="text-xs text-yellow-800 font-medium">⚠️ Download a backup before every major update or deploy.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleBackupDownload} disabled={backupLoading} className="btn-primary flex items-center gap-1.5">
            <Download size={13}/>{backupLoading ? 'Preparing…' : 'Download Backup (.json)'}
          </button>
          <button onClick={() => restoreFileRef.current.click()} disabled={restoreLoading} className="btn-secondary flex items-center gap-1.5">
            <Upload size={13}/>{restoreLoading ? 'Restoring…' : 'Restore from Backup'}
          </button>
          <input type="file" accept=".json" ref={restoreFileRef} style={{display:'none'}} onChange={handleRestoreFile} />
        </div>
        {restoreResult && (
          <div className={`flex items-center gap-2 text-sm ${restoreResult.ok ? 'text-apple-green' : 'text-apple-red'}`}>
            {restoreResult.ok ? <CheckCircle size={14}/> : <XCircle size={14}/>}
            {restoreResult.msg}
            {restoreResult.ok && <button onClick={() => window.location.reload()} className="underline text-apple-blue ml-1">Refresh now</button>}
          </div>
        )}
      </Section>

      <div className="flex justify-end pb-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
          {saved?<><CheckCircle size={13}/>Saved</>:<><Save size={13}/>{saving?'Saving…':'Save All Settings'}</>}
        </button>
      </div>
    </div>
  );
}
