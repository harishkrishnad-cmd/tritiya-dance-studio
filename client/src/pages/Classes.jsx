import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, UserPlus, UserMinus, Users, Clock } from 'lucide-react';
import Modal from '../components/Modal';
import { api } from '../api';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const LEVELS = ['All','Beginner','Primary','Junior','Intermediate','Senior','Advanced'];
const empty = { name:'', day_of_week:'Monday', start_time:'16:00', end_time:'17:30', level:'All', description:'', max_students:20 };

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [available, setAvailable] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{ setClasses(await api.getClasses()); },[]);
  useEffect(()=>{ load(); },[load]);

  async function openDetail(cls) {
    const [d,avail] = await Promise.all([api.getClass(cls.id),api.getAvailableStudents(cls.id)]);
    setDetail(d); setAvailable(avail); setDetailOpen(true);
  }
  function openAdd() { setEditing(null); setForm(empty); setModalOpen(true); }
  function openEdit(cls) { setEditing(cls); setForm({...cls}); setModalOpen(true); }
  async function handleSave() {
    if (!form.name||!form.day_of_week||!form.start_time||!form.end_time) return alert('Fill required fields');
    setSaving(true);
    try { editing ? await api.updateClass(editing.id,form) : await api.createClass(form); setModalOpen(false); load(); }
    finally { setSaving(false); }
  }
  async function handleDelete(cls) {
    if (!confirm(`Delete "${cls.name}"?`)) return;
    await api.deleteClass(cls.id); load();
  }
  async function handleEnroll(sid) {
    await api.addStudentToClass(detail.id,sid);
    const [d,avail]=await Promise.all([api.getClass(detail.id),api.getAvailableStudents(detail.id)]);
    setDetail(d); setAvailable(avail);
  }
  async function handleUnenroll(sid) {
    await api.removeStudentFromClass(detail.id,sid);
    const [d,avail]=await Promise.all([api.getClass(detail.id),api.getAvailableStudents(detail.id)]);
    setDetail(d); setAvailable(avail);
  }

  const today = new Date().toLocaleDateString('en-US',{weekday:'long'});

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-apple-text tracking-tight">Classes</h1>
          <p className="text-xs text-apple-gray-5 mt-0.5">{classes.length} active</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-1.5"><Plus size={14}/> New Class</button>
      </div>

      <div className="space-y-3">
        {DAYS.map(day => {
          const dayCls = classes.filter(c=>c.day_of_week===day);
          const isToday = day===today;
          return (
            <div key={day} className={`card p-0 overflow-hidden ${isToday ? 'ring-1 ring-apple-blue/40' : ''}`}>
              <div className={`flex items-center justify-between px-4 py-2.5 ${isToday ? 'bg-apple-blue' : 'bg-apple-gray border-b border-apple-gray-2'}`}>
                <span className={`text-sm font-semibold ${isToday?'text-white':'text-apple-text'}`}>{day}</span>
                <div className="flex items-center gap-2">
                  {isToday && <span className="text-xs text-white/70 bg-white/15 px-2 py-0.5 rounded-full">Today</span>}
                  {dayCls.length===0 && <span className={`text-xs ${isToday?'text-white/50':'text-apple-gray-4'}`}>No classes</span>}
                </div>
              </div>
              {dayCls.length>0 && (
                <div className="p-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {dayCls.map(cls=>(
                    <button key={cls.id} onClick={()=>openDetail(cls)}
                      className="text-left bg-apple-gray hover:bg-apple-gray-2 rounded-apple-sm p-3 transition-colors group">
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="font-medium text-sm text-apple-text">{cls.name}</span>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>openEdit(cls)} className="p-1 hover:bg-white rounded text-apple-gray-5"><Edit2 size={11}/></button>
                          <button onClick={()=>handleDelete(cls)} className="p-1 hover:bg-red-50 rounded text-apple-gray-5 hover:text-apple-red"><Trash2 size={11}/></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-apple-gray-5 mb-1"><Clock size={10}/>{cls.start_time} – {cls.end_time}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-apple-gray-5">{cls.level}</span>
                        <span className="text-xs text-apple-gray-5 flex items-center gap-1"><Users size={10}/>{cls.studentCount}/{cls.max_students}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit */}
      <Modal isOpen={modalOpen} onClose={()=>setModalOpen(false)} title={editing?'Edit Class':'New Class'}>
        <div className="space-y-3">
          <div><label className="label">Class Name *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Beginners Bharatanatyam"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Day *</label><select className="input" value={form.day_of_week} onChange={e=>setForm(f=>({...f,day_of_week:e.target.value}))}>{DAYS.map(d=><option key={d}>{d}</option>)}</select></div>
            <div><label className="label">Level</label><select className="input" value={form.level} onChange={e=>setForm(f=>({...f,level:e.target.value}))}>{LEVELS.map(l=><option key={l}>{l}</option>)}</select></div>
            <div><label className="label">Start Time *</label><input type="time" className="input" value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))}/></div>
            <div><label className="label">End Time *</label><input type="time" className="input" value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))}/></div>
            <div><label className="label">Max Students</label><input type="number" className="input" value={form.max_students} onChange={e=>setForm(f=>({...f,max_students:e.target.value}))}/></div>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional…"/></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-apple-gray-2">
          <button className="btn-secondary" onClick={()=>setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':editing?'Save Changes':'Create Class'}</button>
        </div>
      </Modal>

      {/* Detail */}
      {detail && (
        <Modal isOpen={detailOpen} onClose={()=>setDetailOpen(false)} title={detail.name} size="lg">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-xs text-apple-gray-5 bg-apple-gray rounded-apple-sm p-3">
              <span>📅 {detail.day_of_week}</span>
              <span>⏰ {detail.start_time} – {detail.end_time}</span>
              <span>🎯 {detail.level}</span>
              <span>👥 {detail.students.length}/{detail.max_students}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide mb-2">Enrolled Students</p>
              {detail.students.length===0 ? <p className="text-sm text-apple-gray-4">No students enrolled</p>
                : <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {detail.students.map(s=>(
                    <div key={s.id} className="flex items-center justify-between bg-apple-gray rounded-apple-sm px-3 py-2">
                      <div><span className="text-sm font-medium">{s.name}</span><span className="text-xs text-apple-gray-4 ml-2">{s.level}</span></div>
                      <button onClick={()=>handleUnenroll(s.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-apple-gray-4 hover:text-apple-red"><UserMinus size={13}/></button>
                    </div>
                  ))}
                </div>
              }
            </div>
            {available.length>0 && (
              <div>
                <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide mb-2">Add Students</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {available.map(s=>(
                    <div key={s.id} className="flex items-center justify-between bg-apple-gray rounded-apple-sm px-3 py-2">
                      <span className="text-sm">{s.name} <span className="text-apple-gray-4 text-xs">{s.level}</span></span>
                      <button onClick={()=>handleEnroll(s.id)} className="btn-primary py-1 px-2 text-xs flex items-center gap-1"><UserPlus size={11}/>Enroll</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
