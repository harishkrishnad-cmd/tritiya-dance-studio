import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, Edit2, Trash2, Mail, Phone, ChevronDown, ChevronUp, BookOpen, Copy, RefreshCw, KeyRound } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../api';

const LEVELS = ['Beginner', 'Primary', 'Junior', 'Intermediate', 'Senior', 'Advanced'];
const empty = { name:'', date_of_birth:'', level:'Beginner', enrollment_date:new Date().toISOString().split('T')[0], parent_name:'', parent_email:'', parent_phone:'', emergency_contact:'', address:'', monthly_fee:'', notes:'', student_email:'' };

function StudentForm({ data, onChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Student Name *</label><input className="input" value={data.name} onChange={e=>onChange('name',e.target.value)} placeholder="Full name" /></div>
        <div><label className="label">Date of Birth</label><input type="date" className="input" value={data.date_of_birth} onChange={e=>onChange('date_of_birth',e.target.value)} /></div>
        <div><label className="label">Dance Level</label><select className="input" value={data.level} onChange={e=>onChange('level',e.target.value)}>{LEVELS.map(l=><option key={l}>{l}</option>)}</select></div>
        <div><label className="label">Enrollment Date</label><input type="date" className="input" value={data.enrollment_date} onChange={e=>onChange('enrollment_date',e.target.value)} /></div>
        <div><label className="label">Monthly Fee (₹)</label><input type="number" className="input" value={data.monthly_fee} onChange={e=>onChange('monthly_fee',e.target.value)} placeholder="0" /></div>
      </div>
      <div className="border-t border-apple-gray-2 pt-4">
        <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide mb-3">Parent / Guardian</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><label className="label">Parent Name</label><input className="input" value={data.parent_name} onChange={e=>onChange('parent_name',e.target.value)} placeholder="Parent full name" /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={data.parent_email} onChange={e=>onChange('parent_email',e.target.value)} placeholder="email@example.com" /></div>
          <div><label className="label">Phone</label><input type="tel" className="input" value={data.parent_phone} onChange={e=>onChange('parent_phone',e.target.value)} placeholder="+91 XXXXX XXXXX" /></div>
          <div><label className="label">Emergency Contact</label><input type="tel" className="input" value={data.emergency_contact} onChange={e=>onChange('emergency_contact',e.target.value)} placeholder="Emergency phone" /></div>
          <div><label className="label">Address</label><input className="input" value={data.address} onChange={e=>onChange('address',e.target.value)} placeholder="Home address" /></div>
        </div>
      </div>
      <div className="border-t border-apple-gray-2 pt-4">
        <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide mb-1">Student Learning Portal</p>
        <p className="text-xs text-apple-gray-4 mb-3">Student's own email for OTP login to the Learning Hub at <span className="font-mono text-apple-blue">/student</span></p>
        <div><label className="label">Student Email (for LMS login)</label><input type="email" className="input" value={data.student_email||''} onChange={e=>onChange('student_email',e.target.value)} placeholder="student@example.com" /></div>
      </div>
      <div><label className="label">Notes</label><textarea className="input" rows={2} value={data.notes} onChange={e=>onChange('notes',e.target.value)} placeholder="Any special notes…" /></div>
    </div>
  );
}

function StudentCredentials({ studentId }) {
  const [creds, setCreds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => { load(); }, [studentId]);

  async function load() {
    setLoading(true);
    try { setCreds(await api.getStudentPortalCredentials(studentId)); } catch { setCreds(null); }
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    try { setCreds(await api.generateStudentCredentials(studentId)); } catch { alert('Failed to generate credentials'); }
    setGenerating(false);
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(''), 1500); });
  }

  if (loading) return <p className="text-xs text-apple-gray-4">Loading…</p>;

  const hasCredentials = creds?.student_username;

  return (
    <div>
      <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide mb-2 flex items-center gap-1"><KeyRound size={11}/>Student Portal</p>
      {hasCredentials ? (
        <div className="space-y-1.5">
          <div className="bg-white rounded-apple-sm border border-apple-gray-2 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-apple-gray-4 mb-0.5">Username</p>
                <p className="text-xs font-mono font-medium text-apple-text">{creds.student_username}</p>
              </div>
              <button onClick={() => copy(creds.student_username, 'user')}
                className="p-1 hover:bg-apple-gray rounded text-apple-gray-5 flex-shrink-0">
                {copied === 'user' ? <span className="text-apple-green text-xs">✓</span> : <Copy size={11}/>}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-apple-sm border border-apple-gray-2 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-apple-gray-4 mb-0.5">Password</p>
                <p className="text-xs font-mono font-medium text-apple-text">{creds.student_pin || '••••••••'}</p>
              </div>
              {creds.student_pin && (
                <button onClick={() => copy(creds.student_pin, 'pass')}
                  className="p-1 hover:bg-apple-gray rounded text-apple-gray-5 flex-shrink-0">
                  {copied === 'pass' ? <span className="text-apple-green text-xs">✓</span> : <Copy size={11}/>}
                </button>
              )}
            </div>
          </div>
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-1 text-xs text-apple-gray-4 hover:text-apple-blue mt-1">
            <RefreshCw size={10}/>{generating ? 'Resetting…' : 'Reset credentials'}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-apple-gray-4 mb-2">No student login yet.</p>
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-1.5 text-xs bg-apple-blue text-white px-3 py-1.5 rounded-apple-sm font-medium">
            <KeyRound size={10}/>{generating ? 'Generating…' : 'Generate Credentials'}
          </button>
        </div>
      )}
    </div>
  );
}

function StudentRow({ student, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState(null);

  async function toggle() {
    if (!expanded && !details) setDetails(await api.getStudent(student.id));
    setExpanded(v => !v);
  }

  return (
    <>
      <tr className="hover:bg-apple-gray/50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-apple-blue-light flex items-center justify-center text-apple-blue font-semibold text-sm flex-shrink-0">{student.name.charAt(0)}</div>
            <div>
              <div className="font-medium text-sm text-apple-text">{student.name}</div>
              {student.date_of_birth && <div className="text-xs text-apple-gray-4">{new Date(student.date_of_birth).toLocaleDateString('en-IN')}</div>}
            </div>
          </div>
        </td>
        <td className="px-4 py-3"><span className="text-xs bg-apple-gray text-apple-gray-5 px-2 py-0.5 rounded-full font-medium">{student.level}</span></td>
        <td className="px-4 py-3">
          <div className="text-sm text-apple-text">{student.parent_name||'—'}</div>
          {student.parent_email&&<div className="text-xs text-apple-gray-4 flex items-center gap-1"><Mail size={10}/>{student.parent_email}</div>}
          {student.parent_phone&&<div className="text-xs text-apple-gray-4 flex items-center gap-1"><Phone size={10}/>{student.parent_phone}</div>}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-apple-text">₹{student.monthly_fee||0}<span className="text-apple-gray-4 font-normal">/mo</span></td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-1.5 hover:bg-apple-gray rounded-lg text-apple-gray-5">{expanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>
            <button onClick={()=>onEdit(student)} className="p-1.5 hover:bg-apple-gray rounded-lg text-apple-gray-5 hover:text-apple-blue"><Edit2 size={14}/></button>
            <button onClick={()=>onDelete(student)} className="p-1.5 hover:bg-red-50 rounded-lg text-apple-gray-5 hover:text-apple-red"><Trash2 size={14}/></button>
          </div>
        </td>
      </tr>
      {expanded && details && (
        <tr className="bg-apple-gray/40">
          <td colSpan={5} className="px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide mb-2 flex items-center gap-1"><BookOpen size={11}/>Classes</p>
                {details.classes.length===0 ? <p className="text-apple-gray-4 text-xs">Not enrolled</p>
                  : details.classes.map(c=>(
                    <div key={c.id} className="bg-white rounded-apple-sm px-3 py-2 mb-1.5 border border-apple-gray-2">
                      <div className="font-medium text-xs">{c.name}</div>
                      <div className="text-apple-gray-4 text-xs">{c.day_of_week} · {c.start_time}</div>
                    </div>
                  ))}
              </div>
              <div>
                <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide mb-2">Attendance</p>
                {details.attendanceSummary && (
                  <div className="space-y-1.5">
                    {[['Present','apple-green',details.attendanceSummary.present||0],['Absent','apple-red',details.attendanceSummary.absent||0],['Late','apple-orange',details.attendanceSummary.late||0]].map(([l,c,v])=>(
                      <div key={l} className="flex justify-between items-center">
                        <span className={`text-xs text-${c}`}>{l}</span>
                        <span className="text-xs font-semibold text-apple-text">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide mb-2">Recent Payments</p>
                {details.recentPayments.slice(0,3).map(p=>(
                  <div key={p.id} className="flex justify-between mb-1.5">
                    <span className="text-xs text-apple-gray-5">{new Date(p.due_date).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</span>
                    <span className={`text-xs font-medium ${p.status==='paid'?'text-apple-green':'text-apple-red'}`}>₹{p.amount} · {p.status}</span>
                  </div>
                ))}
              </div>
              <div>
                <StudentCredentials studentId={student.id} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => { setLoading(true); setStudents(await api.getStudents({active:true})); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setForm(empty); setModalOpen(true); }
  function openEdit(s) { setEditing(s); setForm({...empty,...s,monthly_fee:s.monthly_fee||''}); setModalOpen(true); }
  async function handleSave() {
    if (!form.name.trim()) return alert('Student name is required');
    setSaving(true);
    try { editing ? await api.updateStudent(editing.id,form) : await api.createStudent(form); setModalOpen(false); load(); }
    finally { setSaving(false); }
  }
  async function handleDelete(s) {
    if (!confirm(`Remove ${s.name}?`)) return;
    await api.deleteStudent(s.id); load();
  }

  const filtered = students.filter(s =>
    [s.name, s.parent_name, s.parent_email].some(v => (v||'').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-apple-text tracking-tight">Students</h1>
          <p className="text-xs text-apple-gray-5 mt-0.5">{students.length} active</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5"><UserPlus size={14}/> Add Student</button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-apple-gray-4" />
        <input className="input pl-9 bg-white shadow-apple" placeholder="Search name, parent or email…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block card p-0 overflow-hidden">
        {loading ? <div className="text-center py-12 text-sm text-apple-gray-5">Loading…</div>
        : filtered.length===0 ? (
          <div className="text-center py-14">
            <div className="text-3xl mb-2">🪷</div>
            <p className="text-sm text-apple-gray-5">{search ? 'No results' : 'No students yet — add your first!'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-apple-gray-2">
              {['Student','Level','Parent','Monthly Fee',''].map(h=>(
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-apple-gray-5 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-apple-gray-2/60">
              {filtered.map(s=><StudentRow key={s.id} student={s} onEdit={openEdit} onDelete={handleDelete}/>)}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {loading ? <div className="text-center py-10 text-sm text-apple-gray-5">Loading…</div>
        : filtered.length===0 ? (
          <div className="card text-center py-10"><div className="text-3xl mb-2">🪷</div><p className="text-sm text-apple-gray-5">{search?'No results':'Add your first student!'}</p></div>
        ) : filtered.map(s=>(
          <div key={s.id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-apple-blue-light flex items-center justify-center text-apple-blue font-semibold">{s.name.charAt(0)}</div>
                <div>
                  <div className="font-medium text-apple-text">{s.name}</div>
                  <span className="text-xs bg-apple-gray text-apple-gray-5 px-2 py-0.5 rounded-full">{s.level}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={()=>openEdit(s)} className="p-2 hover:bg-apple-gray rounded-apple-sm text-apple-gray-5"><Edit2 size={14}/></button>
                <button onClick={()=>handleDelete(s)} className="p-2 hover:bg-red-50 rounded-apple-sm text-apple-gray-5 hover:text-apple-red"><Trash2 size={14}/></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="bg-apple-gray rounded-apple-sm px-3 py-2"><div className="text-xs text-apple-gray-5 mb-0.5">Parent</div><div className="text-sm font-medium truncate">{s.parent_name||'—'}</div></div>
              <div className="bg-apple-gray rounded-apple-sm px-3 py-2"><div className="text-xs text-apple-gray-5 mb-0.5">Monthly Fee</div><div className="text-sm font-semibold text-apple-blue">₹{s.monthly_fee||0}</div></div>
              {s.parent_phone&&<div className="bg-apple-gray rounded-apple-sm px-3 py-2 col-span-2"><div className="text-xs text-apple-gray-5 mb-0.5">Phone</div><a href={`tel:${s.parent_phone}`} className="text-sm text-apple-blue">{s.parent_phone}</a></div>}
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Student':'New Student'} size="lg">
        <StudentForm data={form} onChange={(k,v)=>setForm(f=>({...f,[k]:v}))} />
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-apple-gray-2">
          <button className="btn-secondary" onClick={()=>setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':editing?'Save Changes':'Add Student'}</button>
        </div>
      </Modal>
    </div>
  );
}
