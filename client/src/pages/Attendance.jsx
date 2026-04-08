import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, CheckCircle, XCircle, Clock, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api';

const STATUS = {
  present: { label:'Present', icon:CheckCircle, color:'bg-green-50 border-apple-green/30 text-apple-green' },
  absent:  { label:'Absent',  icon:XCircle,     color:'bg-red-50 border-apple-red/30 text-apple-red' },
  late:    { label:'Late',    icon:Clock,        color:'bg-orange-50 border-apple-orange/30 text-apple-orange' },
};

export default function Attendance() {
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [selDate, setSelDate] = useState(new Date().toISOString().split('T')[0]);
  const [session, setSession] = useState(null);
  const [att, setAtt] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [tab, setTab] = useState('mark');

  useEffect(()=>{ api.getClasses().then(setClasses); },[]);
  useEffect(()=>{ if(selClass) api.getSessions({class_id:selClass}).then(setSessions); },[selClass]);

  const loadSession = useCallback(async()=>{
    if(!selClass||!selDate) return;
    let s = await api.createSession({class_id:selClass,session_date:selDate});
    s = await api.getSession(s.id);
    setSession(s);
    const a={};
    s.students.forEach(st=>{ a[st.id] = st.status==='not_marked'?'present':st.status; });
    setAtt(a); setSaved(false);
  },[selClass,selDate]);

  useEffect(()=>{ loadSession(); },[loadSession]);

  function markAll(status) { if(!session) return; const a={}; session.students.forEach(s=>{a[s.id]=status;}); setAtt(a); setSaved(false); }
  async function handleSave() {
    if(!session) return;
    setSaving(true);
    await api.markAttendance(session.id, Object.entries(att).map(([id,status])=>({student_id:parseInt(id),status})));
    setSaving(false); setSaved(true);
    api.getSessions({class_id:selClass}).then(setSessions);
  }
  function shiftDate(d) { const dt=new Date(selDate); dt.setDate(dt.getDate()+d); setSelDate(dt.toISOString().split('T')[0]); }

  const present=Object.values(att).filter(s=>s==='present').length;
  const absent=Object.values(att).filter(s=>s==='absent').length;
  const late=Object.values(att).filter(s=>s==='late').length;
  const selClassInfo = classes.find(c=>String(c.id)===String(selClass));

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-apple-text tracking-tight">Attendance</h1>
        <p className="text-xs text-apple-gray-5 mt-0.5">Mark and view student attendance</p>
      </div>

      <div className="card grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Class</label>
          <select className="input" value={selClass} onChange={e=>setSelClass(e.target.value)}>
            <option value="">— Select class —</option>
            {classes.map(c=><option key={c.id} value={c.id}>{c.name} ({c.day_of_week} {c.start_time})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <div className="flex gap-1.5">
            <button onClick={()=>shiftDate(-1)} className="btn-secondary px-2.5"><ChevronLeft size={15}/></button>
            <input type="date" className="input flex-1" value={selDate} onChange={e=>setSelDate(e.target.value)}/>
            <button onClick={()=>shiftDate(1)} className="btn-secondary px-2.5"><ChevronRight size={15}/></button>
          </div>
        </div>
      </div>

      {selClass && (
        <div className="flex gap-1 p-1 bg-apple-gray rounded-apple-sm w-fit">
          {['mark','history'].map(t=>(
            <button key={t} onClick={()=>setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab===t?'bg-white shadow-apple text-apple-text':'text-apple-gray-5 hover:text-apple-text'}`}>{t==='mark'?'Mark Attendance':'History'}</button>
          ))}
        </div>
      )}

      {tab==='mark' && selClass && session && (
        <div className="card space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-apple-text">{selClassInfo?.name}</h2>
              <p className="text-xs text-apple-gray-5">{new Date(selDate).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={()=>markAll('present')} className="btn-success flex items-center gap-1 py-1.5 px-3 text-xs"><CheckSquare size={12}/>All Present</button>
              <button onClick={()=>markAll('absent')} className="btn-danger flex items-center gap-1 py-1.5 px-3 text-xs"><XCircle size={12}/>All Absent</button>
            </div>
          </div>

          {session.students.length>0 && (
            <div className="flex gap-4 text-xs">
              <span className="text-apple-green font-medium">✓ {present} Present</span>
              <span className="text-apple-red font-medium">✗ {absent} Absent</span>
              <span className="text-apple-orange font-medium">⏱ {late} Late</span>
            </div>
          )}

          {session.students.length===0 ? (
            <div className="text-center py-10"><ClipboardCheck size={32} className="mx-auto mb-2 text-apple-gray-3" strokeWidth={1.5}/><p className="text-sm text-apple-gray-5">No students enrolled</p></div>
          ) : (
            <div className="space-y-2">
              {session.students.map(student => {
                const status = att[student.id]||'present';
                return (
                  <div key={student.id} className={`flex items-center justify-between rounded-apple-sm border px-3 py-2.5 ${STATUS[status].color}`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 flex-shrink-0 rounded-full bg-white flex items-center justify-center text-sm font-semibold text-apple-text">{student.name.charAt(0)}</div>
                      <div className="min-w-0"><div className="text-sm font-medium text-apple-text truncate">{student.name}</div><div className="text-xs text-apple-gray-5">{student.level}</div></div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {Object.entries(STATUS).map(([s,cfg])=>(
                        <button key={s} onClick={()=>{ setAtt(a=>({...a,[student.id]:s})); setSaved(false); }}
                          className={`py-1 rounded-lg text-xs font-medium transition-all border ${status===s?'bg-white shadow-sm border-current px-2 sm:px-3':'bg-transparent border-transparent opacity-40 hover:opacity-70 px-1 sm:px-2'}`}>
                          <span className="hidden sm:inline">{cfg.label}</span>
                          <span className="sm:hidden">{s==='present'?'✓':s==='absent'?'✗':'⏱'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {session.students.length>0 && (
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-apple-gray-2">
              {saved && <span className="text-xs text-apple-green flex items-center gap-1"><CheckCircle size={12}/>Saved</span>}
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm">
                <ClipboardCheck size={14}/>{saving?'Saving…':'Save Attendance'}
              </button>
            </div>
          )}
        </div>
      )}

      {tab==='history' && selClass && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-sm text-apple-text">Session History</h2>
          {sessions.length===0 ? <p className="text-sm text-apple-gray-4 py-4 text-center">No sessions yet</p>
            : <div className="space-y-1.5">
              {sessions.map(s=>(
                <div key={s.id} onClick={()=>{ setSelDate(s.session_date); setTab('mark'); }}
                  className="flex items-center justify-between bg-apple-gray hover:bg-apple-gray-2 rounded-apple-sm px-3 py-2.5 cursor-pointer transition-colors">
                  <div>
                    <div className="text-sm font-medium text-apple-text">{new Date(s.session_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>
                    <span className={`text-xs font-medium ${s.status==='completed'?'text-apple-green':'text-apple-orange'}`}>{s.status}</span>
                  </div>
                  <div className="text-right"><div className="text-sm font-medium text-apple-text">{s.marked_count}/{s.enrolled_count}</div><div className="text-xs text-apple-gray-4">marked</div></div>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {!selClass && (
        <div className="text-center py-16 text-apple-gray-4"><ClipboardCheck size={36} className="mx-auto mb-3" strokeWidth={1.5}/><p className="text-sm">Select a class to begin</p></div>
      )}
    </div>
  );
}
