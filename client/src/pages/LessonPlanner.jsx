import React, { useState, useEffect } from 'react';
import { Plus, Send, ChevronLeft, ChevronRight, BookOpen, CheckCircle, Clock, MessageSquare, Mail } from 'lucide-react';
import { api } from '../api';
import Modal from '../components/Modal';

const SUBJECTS = [
  'Adavus (Basic Steps)', 'Jathis', 'Alarippu', 'Jatiswaram', 'Shabdam',
  'Varnam', 'Padam', 'Javali', 'Thillana', 'Slokam',
  'Nritta', 'Abhinaya', 'Hastamudras', 'Theory & History', 'Other'
];

const STATUS_COLORS = {
  planned: 'bg-blue-50 text-apple-blue',
  completed: 'bg-green-50 text-apple-green',
  cancelled: 'bg-red-50 text-apple-red',
};

function fmt(d) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }

export default function LessonPlanner() {
  const [plans, setPlans] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filterClass, setFilterClass] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [notifyingId, setNotifyingId] = useState(null);
  const [notifyResult, setNotifyResult] = useState({});
  const [form, setForm] = useState({ class_id: '', plan_date: '', subject: '', topic: '', description: '', homework: '', duration_minutes: '60' });

  useEffect(() => { api.getClasses().then(setClasses); }, []);
  useEffect(() => { load(); }, [filterClass, month, year]);

  async function load() {
    const p = { month, year };
    if (filterClass) p.class_id = filterClass;
    const data = await api.getLessonPlans(p);
    setPlans(data);
  }

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }

  async function handleCreate(e) {
    e.preventDefault();
    await api.createLessonPlan(form);
    setShowForm(false);
    setForm({ class_id: '', plan_date: '', subject: '', topic: '', description: '', homework: '', duration_minutes: '60' });
    load();
  }

  async function handleNotify(id) {
    setNotifyingId(id);
    setNotifyResult(r => ({ ...r, [id]: null }));
    try {
      const r = await api.notifyLessonPlan(id);
      setNotifyResult(r => ({ ...r, [id]: { success: true, msg: `Sent to ${r.notified || 0} parent${(r.notified || 0) !== 1 ? 's' : ''}` } }));
      load();
    } catch (e) {
      setNotifyResult(r => ({ ...r, [id]: { success: false, msg: e.message } }));
    }
    setNotifyingId(null);
  }

  const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  // Group by date
  const byDate = plans.reduce((acc, p) => {
    const d = p.plan_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(p);
    return acc;
  }, {});
  const dates = Object.keys(byDate).sort();

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-apple-text tracking-tight">Lesson Planner</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={14}/> Add Lesson Plan
        </button>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 hover:bg-apple-gray rounded-lg"><ChevronLeft size={16} className="text-apple-gray-5"/></button>
          <span className="text-sm font-medium text-apple-text w-36 text-center">{monthName}</span>
          <button onClick={nextMonth} className="p-1.5 hover:bg-apple-gray rounded-lg"><ChevronRight size={16} className="text-apple-gray-5"/></button>
        </div>
        <select className="input text-sm py-1.5" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Plans */}
      {dates.length === 0 ? (
        <div className="card text-center py-12 text-apple-gray-4">
          <BookOpen size={32} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm">No lesson plans for {monthName}</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-sm text-apple-blue hover:underline">Add the first one</button>
        </div>
      ) : (
        <div className="space-y-3">
          {dates.map(date => (
            <div key={date}>
              <p className="text-xs font-semibold text-apple-gray-5 uppercase tracking-wide mb-2 px-1">{fmt(date + 'T00:00:00')}</p>
              <div className="space-y-2">
                {byDate[date].map(plan => (
                  <div key={plan.id} className="card">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[plan.status] || 'bg-apple-gray text-apple-gray-5'}`}>{plan.status}</span>
                          <span className="text-xs text-apple-gray-5 bg-apple-gray px-2 py-0.5 rounded-full">{plan.class_name || `Class ${plan.class_id}`}</span>
                          {plan.duration_minutes && <span className="text-xs text-apple-gray-5 flex items-center gap-1"><Clock size={11}/>{plan.duration_minutes} min</span>}
                          {(plan.whatsapp_sent || plan.email_sent) && (
                            <span className="text-xs text-apple-green flex items-center gap-1">
                              {plan.whatsapp_sent && <MessageSquare size={11}/>}
                              {plan.email_sent && <Mail size={11}/>}
                              Notified
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-apple-text">{plan.subject}</p>
                        {plan.topic && <p className="text-sm text-apple-text mt-0.5">{plan.topic}</p>}
                        {plan.description && <p className="text-xs text-apple-gray-5 mt-1">{plan.description}</p>}
                        {plan.homework && <p className="text-xs text-apple-gray-5 mt-1"><span className="font-medium">Homework:</span> {plan.homework}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {notifyResult[plan.id] && (
                          <span className={`text-xs ${notifyResult[plan.id].success ? 'text-apple-green' : 'text-apple-red'}`}>
                            {notifyResult[plan.id].msg}
                          </span>
                        )}
                        <button
                          onClick={() => handleNotify(plan.id)}
                          disabled={notifyingId === plan.id}
                          className="btn-secondary text-xs flex items-center gap-1 py-1.5 px-3"
                          title="Send WhatsApp + Email to all enrolled parents"
                        >
                          <Send size={11}/>{notifyingId === plan.id ? 'Sending…' : 'Notify'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Lesson Plan">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Class *</label>
              <select className="input" value={form.class_id} onChange={e => setForm(f => ({...f, class_id: e.target.value}))} required>
                <option value="">Select class…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.plan_date} onChange={e => setForm(f => ({...f, plan_date: e.target.value}))} required/>
            </div>
          </div>
          <div>
            <label className="label">Subject *</label>
            <select className="input" value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} required>
              <option value="">Select subject…</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Topic / Title</label>
            <input className="input" value={form.topic} onChange={e => setForm(f => ({...f, topic: e.target.value}))} placeholder="e.g., Natta Adavu — 8 counts"/>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="What will be covered in class…"/>
          </div>
          <div>
            <label className="label">Homework / Practice at Home</label>
            <textarea className="input" rows={2} value={form.homework} onChange={e => setForm(f => ({...f, homework: e.target.value}))} placeholder="Practice Natta Adavu for 10 minutes daily…"/>
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input type="number" min="15" max="180" step="15" className="input w-32" value={form.duration_minutes} onChange={e => setForm(f => ({...f, duration_minutes: e.target.value}))}/>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Plan</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
