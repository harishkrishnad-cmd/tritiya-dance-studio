import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ClipboardCheck, CheckCircle, XCircle, Clock, CheckSquare, ChevronLeft, ChevronRight, FileSpreadsheet, Upload, Download, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '../components/Modal';
import { api } from '../api';

const ATT_COLS = [
  { key: 'class_name', label: 'Class Name' },
  { key: 'date', label: 'Date (YYYY-MM-DD)' },
  { key: 'student_name', label: 'Student Name' },
  { key: 'status', label: 'Status (present/absent/late)' },
  { key: 'notes', label: 'Notes' },
];

function downloadAttTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ATT_COLS.map(c => c.label),
    ['Beginners Bharatanatyam', '2026-04-07', 'Priya Sharma', 'present', ''],
    ['Beginners Bharatanatyam', '2026-04-07', 'Ananya Rao', 'absent', 'Sick leave'],
    ['Intermediate Kuchipudi', '2026-04-09', 'Meera Reddy', 'late', 'Arrived 10 min late'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, 'attendance_template.xlsx');
}

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
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

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

  function parseAttFile(file) {
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const normalised = raw.map(r => {
        const out = {};
        for (const [k, v] of Object.entries(r)) {
          const key = k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
          const col = ATT_COLS.find(c => c.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '') === key || c.key === key);
          if (col) out[col.key] = String(v).trim();
        }
        return out;
      }).filter(r => r.class_name && r.date && r.student_name && r.status);
      const VALID = ['present', 'absent', 'late'];
      const errs = [];
      normalised.forEach((r, i) => {
        if (!VALID.includes(r.status.toLowerCase())) errs.push(`Row ${i+2}: Status must be present/absent/late (got "${r.status}")`);
      });
      setImportRows(normalised);
      setImportErrors(errs);
    };
    reader.readAsBinaryString(file);
  }

  function handleAttFile(file) {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { alert('Please upload an Excel or CSV file'); return; }
    parseAttFile(file);
  }

  async function doImport() {
    if (!importRows.length || importErrors.length) return;
    setImporting(true);
    try {
      const r = await api.bulkImportAttendance(importRows);
      setImportResult({ success: true, count: r.imported, skipped: r.skipped });
      setImportRows([]);
      if (selClass) api.getSessions({ class_id: selClass }).then(setSessions);
    } catch (e) {
      setImportResult({ success: false, error: e.message });
    }
    setImporting(false);
  }

  const present=Object.values(att).filter(s=>s==='present').length;
  const absent=Object.values(att).filter(s=>s==='absent').length;
  const late=Object.values(att).filter(s=>s==='late').length;
  const selClassInfo = classes.find(c=>String(c.id)===String(selClass));

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-semibold text-apple-text tracking-tight">Attendance</h1>
          <p className="text-xs text-apple-gray-5 mt-0.5">Mark and view student attendance</p>
        </div>
        <button onClick={() => { setImportOpen(true); setImportRows([]); setImportErrors([]); setImportResult(null); }} className="btn-secondary flex items-center gap-1.5 text-sm"><FileSpreadsheet size={13}/> Import Excel</button>
      </div>

      {/* Import Modal */}
      <Modal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Import Attendance from Excel" size="lg">
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={downloadAttTemplate} className="btn-secondary flex items-center gap-1.5 text-xs"><Download size={12}/> Download Template</button>
          </div>
          {importResult && (
            <div className={`flex items-start gap-3 p-3 rounded-apple-sm ${importResult.success ? 'bg-green-50 border-l-4 border-apple-green' : 'bg-red-50 border-l-4 border-apple-red'}`}>
              {importResult.success
                ? <><CheckCircle size={16} className="text-apple-green shrink-0 mt-0.5"/><div><p className="font-medium text-apple-text text-sm">{importResult.count} record{importResult.count !== 1 ? 's' : ''} imported</p>{importResult.skipped > 0 && <p className="text-xs text-apple-gray-5">{importResult.skipped} skipped (student/class not found or invalid)</p>}</div></>
                : <><AlertCircle size={16} className="text-apple-red shrink-0 mt-0.5"/><p className="text-sm text-apple-text">{importResult.error}</p></>}
            </div>
          )}
          {!importRows.length ? (
            <div
              className={`border-2 border-dashed rounded-apple-sm text-center py-10 cursor-pointer transition-all ${dragOver ? 'border-apple-blue bg-blue-50' : 'border-apple-gray-2 hover:border-apple-blue/40'}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleAttFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleAttFile(e.target.files[0])} />
              <FileSpreadsheet size={32} className="mx-auto text-apple-blue mb-2 opacity-70"/>
              <p className="font-medium text-apple-text text-sm">Drop your Excel file here or click to browse</p>
              <p className="text-xs text-apple-gray-4 mt-1">Columns: Class Name, Date, Student Name, Status (present/absent/late), Notes</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-apple-text">{importRows.length} record{importRows.length !== 1 ? 's' : ''} ready to import</p>
                <button onClick={() => { setImportRows([]); setImportErrors([]); }} className="text-xs text-apple-gray-4 hover:text-apple-red flex items-center gap-1"><X size={12}/> Clear</button>
              </div>
              {importErrors.length > 0 && (
                <div className="bg-orange-50 border-l-4 border-apple-orange p-3 rounded-apple-sm space-y-1">
                  <p className="text-xs font-medium text-apple-text">{importErrors.length} issue{importErrors.length !== 1 ? 's' : ''} found</p>
                  {importErrors.map((e, i) => <p key={i} className="text-xs text-apple-gray-5">• {e}</p>)}
                </div>
              )}
              <div className="overflow-x-auto border border-apple-gray-2 rounded-apple-sm">
                <table className="w-full text-xs">
                  <thead><tr className="bg-apple-gray border-b border-apple-gray-2">
                    {['Class','Date','Student','Status','Notes'].map(h => <th key={h} className="text-left px-3 py-2 text-apple-gray-5 font-semibold uppercase text-[10px] whitespace-nowrap">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-apple-gray-2/60">
                    {importRows.slice(0, 15).map((r, i) => (
                      <tr key={i} className="hover:bg-apple-gray/40">
                        <td className="px-3 py-2 text-apple-text">{r.class_name}</td>
                        <td className="px-3 py-2 text-apple-text">{r.date}</td>
                        <td className="px-3 py-2 text-apple-text">{r.student_name}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.status==='present'?'bg-green-100 text-apple-green':r.status==='absent'?'bg-red-100 text-apple-red':'bg-orange-100 text-apple-orange'}`}>{r.status}</span>
                        </td>
                        <td className="px-3 py-2 text-apple-gray-5">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length > 15 && <p className="text-xs text-apple-gray-5 px-3 py-2 border-t border-apple-gray-2">… and {importRows.length - 15} more</p>}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-apple-gray-2">
          <button className="btn-secondary" onClick={() => setImportOpen(false)}>Cancel</button>
          {importRows.length > 0 && <button className="btn-primary flex items-center gap-1.5" onClick={doImport} disabled={importing || importErrors.length > 0}><Upload size={13}/>{importing ? 'Importing…' : `Import ${importRows.length} Records`}</button>}
        </div>
      </Modal>

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
