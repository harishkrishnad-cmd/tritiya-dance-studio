import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, BookOpen, Video, FileText, Link2, Edit2, ChevronRight, CheckCircle, X, GripVertical } from 'lucide-react';
import { api } from '../api';

const token = () => localStorage.getItem('auth_token');
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
const LMS = '/api/lms';

const MATERIAL_TYPES = [
  { value: 'video', label: 'YouTube Video', icon: '▶️', hint: 'Paste YouTube URL' },
  { value: 'pdf', label: 'PDF / Document', icon: '📄', hint: 'Paste link to PDF or Google Drive file' },
  { value: 'link', label: 'Web Link', icon: '🔗', hint: 'Any website URL' },
  { value: 'text', label: 'Text / Notes', icon: '📝', hint: 'Write notes or instructions directly' },
];

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86868b', padding: 4 }}><X size={18} /></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</label>
    {children}
  </div>;
}

const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e8e8ed', fontSize: 14, background: '#f5f5f7', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };

export default function LMSAdmin() {
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('materials');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCourse, setShowCourse] = useState(false);
  const [showMaterial, setShowMaterial] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [editMaterial, setEditMaterial] = useState(null);

  // Forms
  const [courseForm, setCourseForm] = useState({ title: '', description: '', level: 'All' });
  const [matForm, setMatForm] = useState({ title: '', type: 'video', content: '', duration_minutes: '' });
  const [quizForm, setQuizForm] = useState({ title: '', pass_score: 70, questions: [{ question: '', options: ['', '', '', ''], correct_index: 0 }] });

  useEffect(() => { loadCourses(); }, []);

  async function loadCourses() {
    setLoading(true);
    const res = await fetch(`${LMS}/courses`, { headers: h() });
    const data = await res.json();
    setCourses(data);
    if (selected) setSelected(data.find(c => c.id === selected.id) || null);
    setLoading(false);
  }

  async function saveCourse() {
    await fetch(`${LMS}/courses`, { method: 'POST', headers: h(), body: JSON.stringify(courseForm) });
    setShowCourse(false); setCourseForm({ title: '', description: '', level: 'All' }); loadCourses();
  }

  async function deleteCourse(id) {
    if (!confirm('Delete this course?')) return;
    await fetch(`${LMS}/courses/${id}`, { method: 'DELETE', headers: h() });
    if (selected?.id === id) setSelected(null);
    loadCourses();
  }

  async function saveMaterial() {
    if (editMaterial) {
      await fetch(`${LMS}/materials/${editMaterial.id}`, { method: 'PUT', headers: h(), body: JSON.stringify(matForm) });
    } else {
      await fetch(`${LMS}/courses/${selected.id}/materials`, { method: 'POST', headers: h(), body: JSON.stringify(matForm) });
    }
    setShowMaterial(false); setEditMaterial(null); setMatForm({ title: '', type: 'video', content: '', duration_minutes: '' }); loadCourses();
  }

  async function deleteMaterial(id) {
    await fetch(`${LMS}/materials/${id}`, { method: 'DELETE', headers: h() });
    loadCourses();
  }

  function addQuestion() {
    setQuizForm(q => ({ ...q, questions: [...q.questions, { question: '', options: ['', '', '', ''], correct_index: 0 }] }));
  }

  function removeQuestion(i) {
    setQuizForm(q => ({ ...q, questions: q.questions.filter((_, idx) => idx !== i) }));
  }

  function setQuestion(i, field, value) {
    setQuizForm(q => {
      const qs = [...q.questions];
      if (field === 'option') { qs[i] = { ...qs[i], options: qs[i].options.map((o, oi) => oi === value.idx ? value.val : o) }; }
      else qs[i] = { ...qs[i], [field]: value };
      return { ...q, questions: qs };
    });
  }

  async function saveQuiz() {
    const valid = quizForm.questions.every(q => q.question && q.options.every(o => o));
    if (!valid) return alert('Fill all questions and options');
    await fetch(`${LMS}/courses/${selected.id}/quiz`, { method: 'POST', headers: h(), body: JSON.stringify(quizForm) });
    setShowQuiz(false); loadCourses();
  }

  function openEditMaterial(mat) {
    setEditMaterial(mat);
    setMatForm({ title: mat.title, type: mat.type, content: mat.content, duration_minutes: mat.duration_minutes });
    setShowMaterial(true);
  }

  function openQuiz() {
    if (selected?.quiz) {
      const q = selected.quiz;
      const qs = q.questions ? q.questions.map(q => ({ ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options })) : [];
      setQuizForm({ title: q.title, pass_score: q.pass_score, questions: qs.length ? qs : [{ question: '', options: ['','','',''], correct_index: 0 }] });
    } else {
      setQuizForm({ title: selected.title + ' Quiz', pass_score: 70, questions: [{ question: '', options: ['','','',''], correct_index: 0 }] });
    }
    setShowQuiz(true);
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-apple-gray-4">Loading courses…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 className="text-xl font-semibold text-apple-text tracking-tight">Learning Management</h1>
          <p className="text-sm text-apple-gray-4 mt-0.5">Create courses, materials and quizzes for students</p>
        </div>
        <button onClick={() => setShowCourse(true)} className="btn-primary flex items-center gap-1.5">
          <Plus size={14} /> New Course
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '280px 1fr' : '1fr', gap: 16 }}>
        {/* Course list */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f5' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Courses ({courses.length})</p>
          </div>
          {courses.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#86868b', fontSize: 14 }}>
              <BookOpen size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              No courses yet. Create your first.
            </div>
          ) : courses.map(c => (
            <div key={c.id} onClick={() => { setSelected(c); setTab('materials'); }}
              style={{ padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid #f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: selected?.id === c.id ? '#f0f6ff' : 'white', transition: 'background 0.15s' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</p>
                <p style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>{c.materials?.length || 0} materials · {c.quiz ? '✓ Quiz' : 'No quiz'}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, background: '#f0f6ff', color: '#0071e3', padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>{c.level}</span>
                <button onClick={e => { e.stopPropagation(); deleteCourse(c.id); }} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer', padding: 2 }}><Trash2 size={13} /></button>
                <ChevronRight size={14} style={{ color: '#d2d2d7' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Course detail */}
        {selected && (
          <div>
            {/* Tabs */}
            <div className="card" style={{ padding: '0', marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', background: '#f9f9f9', borderBottom: '1px solid #f0f0f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>{selected.title}</p>
                  <p style={{ fontSize: 13, color: '#86868b', marginTop: 2 }}>{selected.description}</p>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#86868b', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f5' }}>
                {['materials', 'quiz'].map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: tab === t ? '#0071e3' : '#6e6e73', borderBottom: tab === t ? '2px solid #0071e3' : '2px solid transparent', textTransform: 'capitalize' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Materials tab */}
            {tab === 'materials' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>Course Materials</p>
                  <button onClick={() => { setEditMaterial(null); setMatForm({ title:'',type:'video',content:'',duration_minutes:'' }); setShowMaterial(true); }}
                    className="btn-primary flex items-center gap-1.5" style={{ fontSize: 12, padding: '6px 12px' }}>
                    <Plus size={12} /> Add Material
                  </button>
                </div>
                {(!selected.materials || selected.materials.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#86868b', fontSize: 14 }}>No materials yet. Add videos, links or notes.</div>
                ) : selected.materials.map((mat, i) => {
                  const typeInfo = MATERIAL_TYPES.find(t => t.value === mat.type) || MATERIAL_TYPES[2];
                  return (
                    <div key={mat.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < selected.materials.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
                      <span style={{ fontSize: 20 }}>{typeInfo.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>{mat.title}</p>
                        <p style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>{typeInfo.label}{mat.duration_minutes ? ` · ${mat.duration_minutes} min` : ''}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditMaterial(mat)} style={{ background: '#f5f5f7', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#6e6e73' }}><Edit2 size={13} /></button>
                        <button onClick={() => deleteMaterial(mat.id)} style={{ background: '#fff0ef', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', color: '#ff3b30' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quiz tab */}
            {tab === 'quiz' && (
              <div className="card">
                {selected.quiz ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{selected.quiz.title}</p>
                        <p style={{ fontSize: 12, color: '#86868b', marginTop: 2 }}>Pass mark: {selected.quiz.pass_score}% · {selected.quiz.questions?.length || 0} questions</p>
                      </div>
                      <button onClick={openQuiz} className="btn-secondary flex items-center gap-1.5" style={{ fontSize: 12, padding: '6px 12px' }}>
                        <Edit2 size={12} /> Edit Quiz
                      </button>
                    </div>
                    {selected.quiz.questions?.map((q, i) => (
                      <div key={q.id} style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f7' }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', marginBottom: 8 }}>Q{i+1}. {q.question}</p>
                        {(typeof q.options === 'string' ? JSON.parse(q.options) : q.options).map((opt, oi) => (
                          <p key={oi} style={{ fontSize: 12, color: oi === q.correct_index ? '#34c759' : '#86868b', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {oi === q.correct_index ? '✓' : '○'} {opt}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <p style={{ fontSize: 14, color: '#86868b', marginBottom: 16 }}>No quiz for this course yet.</p>
                    <button onClick={openQuiz} className="btn-primary flex items-center gap-2" style={{ margin: '0 auto' }}>
                      <Plus size={14} /> Create Quiz
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {showCourse && (
        <Modal title="New Course" onClose={() => setShowCourse(false)}>
          <Field label="Course Title"><input style={inp} value={courseForm.title} onChange={e => setCourseForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Bharatanatyam Foundations" /></Field>
          <Field label="Description"><textarea style={{...inp,resize:'vertical'}} rows={3} value={courseForm.description} onChange={e => setCourseForm(f=>({...f,description:e.target.value}))} placeholder="What students will learn…" /></Field>
          <Field label="Level">
            <select style={inp} value={courseForm.level} onChange={e => setCourseForm(f=>({...f,level:e.target.value}))}>
              {['All','Beginner','Intermediate','Advanced'].map(l => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <button onClick={saveCourse} disabled={!courseForm.title} className="btn-primary w-full mt-2">Create Course</button>
        </Modal>
      )}

      {showMaterial && (
        <Modal title={editMaterial ? 'Edit Material' : 'Add Material'} onClose={() => { setShowMaterial(false); setEditMaterial(null); }}>
          <Field label="Title"><input style={inp} value={matForm.title} onChange={e=>setMatForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Introduction to Adavu" /></Field>
          <Field label="Type">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {MATERIAL_TYPES.map(t => (
                <button key={t.value} onClick={() => setMatForm(f=>({...f,type:t.value}))}
                  style={{ padding: '10px 12px', borderRadius: 8, border: `2px solid ${matForm.type===t.value?'#0071e3':'#e8e8ed'}`, background: matForm.type===t.value?'#f0f6ff':'#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#1d1d1f', marginTop: 4 }}>{t.label}</p>
                </button>
              ))}
            </div>
          </Field>
          <Field label={MATERIAL_TYPES.find(t=>t.value===matForm.type)?.hint || 'Content'}>
            {matForm.type === 'text'
              ? <textarea style={{...inp,resize:'vertical'}} rows={5} value={matForm.content} onChange={e=>setMatForm(f=>({...f,content:e.target.value}))} placeholder="Write your notes here…" />
              : <input style={inp} value={matForm.content} onChange={e=>setMatForm(f=>({...f,content:e.target.value}))} placeholder={matForm.type==='video'?'https://youtube.com/watch?v=...':'https://...'} />
            }
          </Field>
          <Field label="Duration (minutes, optional)"><input style={inp} type="number" value={matForm.duration_minutes} onChange={e=>setMatForm(f=>({...f,duration_minutes:e.target.value}))} placeholder="30" /></Field>
          <button onClick={saveMaterial} disabled={!matForm.title} className="btn-primary w-full mt-2">{editMaterial ? 'Update' : 'Add Material'}</button>
        </Modal>
      )}

      {showQuiz && (
        <Modal title="Quiz Builder" onClose={() => setShowQuiz(false)}>
          <Field label="Quiz Title"><input style={inp} value={quizForm.title} onChange={e=>setQuizForm(f=>({...f,title:e.target.value}))} /></Field>
          <Field label="Pass Score (%)"><input style={inp} type="number" min="1" max="100" value={quizForm.pass_score} onChange={e=>setQuizForm(f=>({...f,pass_score:parseInt(e.target.value)||70}))} /></Field>
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Questions</p>
              <button onClick={addQuestion} className="btn-secondary flex items-center gap-1" style={{ fontSize: 11, padding: '5px 10px' }}><Plus size={11} /> Add</button>
            </div>
            {quizForm.questions.map((q, qi) => (
              <div key={qi} style={{ background: '#f9f9f9', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#6e6e73' }}>Question {qi+1}</p>
                  {quizForm.questions.length > 1 && <button onClick={() => removeQuestion(qi)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff3b30' }}><X size={13} /></button>}
                </div>
                <input style={{...inp,marginBottom:8}} value={q.question} onChange={e=>setQuestion(qi,'question',e.target.value)} placeholder="Enter your question" />
                <p style={{ fontSize: 11, color: '#86868b', marginBottom: 6 }}>Options (click circle to mark correct answer)</p>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <button onClick={() => setQuestion(qi,'correct_index',oi)}
                      style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${q.correct_index===oi?'#34c759':'#d2d2d7'}`, background: q.correct_index===oi?'#34c759':'transparent', cursor: 'pointer', flexShrink: 0 }} />
                    <input style={{...inp,flex:1}} value={opt} onChange={e=>setQuestion(qi,'option',{idx:oi,val:e.target.value})} placeholder={`Option ${oi+1}`} />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <button onClick={saveQuiz} disabled={!quizForm.title || !quizForm.questions.length} className="btn-primary w-full mt-2">Save Quiz</button>
        </Modal>
      )}
    </div>
  );
}
