import React, { useState, useEffect } from 'react';
import { Save, Mail, Send, School, Bell, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
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

  useEffect(()=>{ api.getSettings().then(d=>{ setS(d); setTestEmail(d.smtp_user||''); }); },[]);
  function set(key,val){ setS(v=>({...v,[key]:val})); setSaved(false); }

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
        <p className="text-xs text-apple-gray-5">Use Gmail App Passwords — Google Account → Security → App Passwords.</p>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="label">SMTP Host</label><input className="input" value={s.smtp_host||''} onChange={e=>set('smtp_host',e.target.value)} placeholder="smtp.gmail.com"/></div>
            <div><label className="label">SMTP Port</label><input type="number" className="input" value={s.smtp_port||'587'} onChange={e=>set('smtp_port',e.target.value)}/></div>
            <div><label className="label">Username</label><input type="email" className="input" value={s.smtp_user||''} onChange={e=>set('smtp_user',e.target.value)} placeholder="your@gmail.com"/></div>
            <div><label className="label">App Password</label><input type="password" className="input" value={s.smtp_pass||''} onChange={e=>set('smtp_pass',e.target.value)} placeholder="App password"/></div>
          </div>
          <div><label className="label">From Name & Email</label><input className="input" value={s.email_from||''} onChange={e=>set('email_from',e.target.value)} placeholder="Tritiya Dance Studio <your@gmail.com>"/></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="ssl" checked={s.smtp_secure==='true'} onChange={e=>set('smtp_secure',e.target.checked?'true':'false')} className="w-4 h-4 accent-apple-blue"/>
            <label htmlFor="ssl" className="text-sm text-apple-text">Use SSL/TLS (port 465)</label>
          </div>
        </div>
        <div className="pt-3 border-t border-apple-gray-2 space-y-2">
          <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide">Test Connection</p>
          <div className="flex gap-2">
            <input type="email" className="input flex-1" value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="Send test to…"/>
            <button onClick={handleTest} disabled={testLoading} className="btn-secondary flex items-center gap-1.5 whitespace-nowrap text-sm"><Send size={13}/>{testLoading?'Sending…':'Send Test'}</button>
          </div>
          {testResult&&(
            <div className={`flex items-center gap-1.5 text-sm ${testResult.success?'text-apple-green':'text-apple-red'}`}>
              {testResult.success?<CheckCircle size={14}/>:<XCircle size={14}/>}
              {testResult.success?'Email sent successfully!':'Failed: '+testResult.error}
            </div>
          )}
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

      <div className="flex justify-end pb-6">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
          {saved?<><CheckCircle size={13}/>Saved</>:<><Save size={13}/>{saving?'Saving…':'Save All Settings'}</>}
        </button>
      </div>
    </div>
  );
}
