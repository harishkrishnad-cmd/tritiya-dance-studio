import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, CheckCircle, Bell, Trash2, Filter, Calendar, IndianRupee, FileSpreadsheet, Upload, Download, X, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Modal from '../components/Modal';
import { api } from '../api';

const PAY_COLS = [
  { key: 'student_name', label: 'Student Name' },
  { key: 'amount', label: 'Amount (₹)' },
  { key: 'date', label: 'Date (YYYY-MM-DD)' },
  { key: 'paid_date', label: 'Paid Date (YYYY-MM-DD)' },
  { key: 'description', label: 'Description' },
  { key: 'payment_method', label: 'Payment Method' },
  { key: 'status', label: 'Status (paid/pending/overdue)' },
];

function downloadPayTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    PAY_COLS.map(c => c.label),
    ['Priya Sharma', '1500', '2026-04-01', '2026-04-05', 'Monthly fee - April 2026', 'Cash', 'paid'],
    ['Ananya Rao', '1500', '2026-04-01', '', 'Monthly fee - April 2026', 'UPI', 'pending'],
    ['Meera Reddy', '1500', '2026-03-01', '2026-04-02', 'Monthly fee - March 2026', 'UPI', 'paid'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Payments');
  XLSX.writeFile(wb, 'payments_template.xlsx');
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const METHODS = ['Cash','UPI','Bank Transfer','Cheque','Online'];

const badge = s => {
  if (s==='paid')    return <span className="badge-paid">Paid</span>;
  if (s==='overdue') return <span className="badge-overdue">Overdue</span>;
  return <span className="badge-pending">Pending</span>;
};

const typeBadge = method => {
  if (!method) return null;
  const m = method.toLowerCase();
  if (m === 'razorpay_autopay') return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-apple-green whitespace-nowrap">🔄 Auto-Pay</span>;
  if (m === 'razorpay') return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-apple-blue whitespace-nowrap">💳 Online</span>;
  return <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-apple-gray text-apple-gray-5 whitespace-nowrap">{method}</span>;
};

const monthLabel = due_date => {
  if (!due_date) return '—';
  const d = new Date(due_date);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

function MarkPaidModal({ payment, onClose, onDone }) {
  const [method,setMethod]=useState('Cash');
  const [paidDate,setPaidDate]=useState(new Date().toISOString().split('T')[0]);
  const [saving,setSaving]=useState(false);
  async function go() { setSaving(true); await api.markPaid(payment.id,{paid_date:paidDate,payment_method:method}); setSaving(false); onDone(); onClose(); }
  return (
    <div className="space-y-4">
      <div className="bg-green-50 rounded-apple-sm p-4 border border-apple-green/20">
        <div className="font-semibold text-apple-text">{payment.student_name}</div>
        <div className="text-2xl font-bold text-apple-green mt-0.5">₹{payment.amount}</div>
        <div className="text-xs text-apple-gray-5 mt-0.5">{payment.description||'Fee payment'}</div>
      </div>
      <div><label className="label">Payment Method</label><select className="input" value={method} onChange={e=>setMethod(e.target.value)}>{METHODS.map(m=><option key={m}>{m}</option>)}</select></div>
      <div><label className="label">Payment Date</label><input type="date" className="input" value={paidDate} onChange={e=>setPaidDate(e.target.value)}/></div>
      <div className="flex justify-end gap-2 pt-2">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-success flex items-center gap-1.5" onClick={go} disabled={saving}><CheckCircle size={14}/>{saving?'Saving…':'Mark as Paid'}</button>
      </div>
    </div>
  );
}

function AddModal({ students, onClose, onDone }) {
  const now=new Date();
  const [form,setForm]=useState({student_id:'',amount:'',due_date:`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`,description:'',status:'pending'});
  const [saving,setSaving]=useState(false);
  async function go() {
    if(!form.student_id||!form.amount||!form.due_date) return alert('Fill required fields');
    setSaving(true); await api.createPayment(form); setSaving(false); onDone(); onClose();
  }
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Student *</label>
        <select className="input" value={form.student_id} onChange={e=>{ const s=students.find(s=>String(s.id)===e.target.value); setForm(f=>({...f,student_id:e.target.value,amount:s?.monthly_fee||f.amount})); }}>
          <option value="">— Select student —</option>
          {students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Amount (₹) *</label><input type="number" className="input" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0"/></div>
        <div><label className="label">Due Date *</label><input type="date" className="input" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}/></div>
      </div>
      <div><label className="label">Description</label><input className="input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. Monthly fee – April 2026"/></div>
      <div className="flex justify-end gap-2 pt-2"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={go} disabled={saving}>{saving?'Saving…':'Add Payment'}</button></div>
    </div>
  );
}

export default function Payments() {
  const [payments,setPayments]=useState([]);
  const [students,setStudents]=useState([]);
  const [stats,setStats]=useState({});
  const [filter,setFilter]=useState({status:'',month:'',year:String(new Date().getFullYear())});
  const [addOpen,setAddOpen]=useState(false);
  const [markOpen,setMarkOpen]=useState(false);
  const [bulkOpen,setBulkOpen]=useState(false);
  const [sel,setSel]=useState(null);
  const [bulkForm,setBulkForm]=useState({month:String(new Date().getMonth()+1),year:String(new Date().getFullYear()),due_day:'1'});
  const [bulkResult,setBulkResult]=useState(null);
  const [bulkLoading,setBulkLoading]=useState(false);
  const [reminding,setReminding]=useState(null);
  const [importOpen,setImportOpen]=useState(false);
  const [importRows,setImportRows]=useState([]);
  const [importErrors,setImportErrors]=useState([]);
  const [importing,setImporting]=useState(false);
  const [importResult,setImportResult]=useState(null);
  const [dragOver,setDragOver]=useState(false);
  const fileRef=useRef();

  const load = useCallback(async()=>{
    const p={}; if(filter.status) p.status=filter.status; if(filter.month) p.month=filter.month; if(filter.year) p.year=filter.year;
    const [pay,stu,st]=await Promise.all([api.getPayments(p),api.getStudents({active:true}),api.getPaymentStats()]);
    setPayments(pay); setStudents(stu); setStats(st);
  },[filter]);
  useEffect(()=>{ load(); },[load]);

  async function handleRemind(p) {
    setReminding(p.id); const r=await api.sendReminder(p.id); setReminding(null);
    if(r.success) alert(`Reminder sent to ${p.parent_email}`); else alert(`Failed: ${r.error}`);
    load();
  }
  async function handleBulk() {
    setBulkLoading(true); const r=await api.bulkMonthlyFees(bulkForm); setBulkResult(r); setBulkLoading(false); load();
  }

  function parsePayFile(file) {
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const normalised = raw.map(r => {
        const out = {};
        for (const [k, v] of Object.entries(r)) {
          const key = k.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_+$/,'');
          const col = PAY_COLS.find(c => c.label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/_+$/,'') === key || c.key === key);
          if (col) out[col.key] = String(v).trim();
        }
        return out;
      }).filter(r => r.student_name && r.amount && r.date);
      const errs = [];
      normalised.forEach((r, i) => {
        if (isNaN(parseFloat(r.amount)) || parseFloat(r.amount) <= 0) errs.push(`Row ${i+2}: Amount must be a positive number`);
      });
      setImportRows(normalised); setImportErrors(errs);
    };
    reader.readAsBinaryString(file);
  }

  function handlePayFile(file) {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { alert('Please upload an Excel or CSV file'); return; }
    parsePayFile(file);
  }

  async function doImport() {
    if (!importRows.length || importErrors.length) return;
    setImporting(true);
    try {
      const r = await api.bulkImportPayments(importRows);
      setImportResult({ success: true, count: r.imported, skipped: r.skipped });
      setImportRows([]); load();
    } catch (e) { setImportResult({ success: false, error: e.message }); }
    setImporting(false);
  }

  const currency='₹';

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-semibold text-apple-text tracking-tight">Payments</h1><p className="text-xs text-apple-gray-5 mt-0.5">{payments.length} records</p></div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>setBulkOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm"><Calendar size={14}/>Generate Monthly</button>
          <button onClick={()=>{ setImportOpen(true); setImportRows([]); setImportErrors([]); setImportResult(null); }} className="btn-secondary flex items-center gap-1.5 text-sm"><FileSpreadsheet size={13}/>Import Excel</button>
          <button onClick={()=>setAddOpen(true)} className="btn-primary flex items-center gap-1.5"><Plus size={14}/>Add Payment</button>
        </div>
      </div>

      {/* Excel Import Modal */}
      <Modal isOpen={importOpen} onClose={()=>setImportOpen(false)} title="Import Payments from Excel" size="lg">
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={downloadPayTemplate} className="btn-secondary flex items-center gap-1.5 text-xs"><Download size={12}/> Download Template</button>
          </div>
          {importResult && (
            <div className={`flex items-start gap-3 p-3 rounded-apple-sm ${importResult.success ? 'bg-green-50 border-l-4 border-apple-green' : 'bg-red-50 border-l-4 border-apple-red'}`}>
              {importResult.success
                ? <><CheckCircle size={16} className="text-apple-green shrink-0 mt-0.5"/><div><p className="font-medium text-apple-text text-sm">{importResult.count} payment{importResult.count!==1?'s':''} imported</p>{importResult.skipped>0 && <p className="text-xs text-apple-gray-5">{importResult.skipped} skipped (student not found or invalid)</p>}</div></>
                : <><AlertCircle size={16} className="text-apple-red shrink-0 mt-0.5"/><p className="text-sm text-apple-text">{importResult.error}</p></>}
            </div>
          )}
          {!importRows.length ? (
            <div
              className={`border-2 border-dashed rounded-apple-sm text-center py-10 cursor-pointer transition-all ${dragOver?'border-apple-blue bg-blue-50':'border-apple-gray-2 hover:border-apple-blue/40'}`}
              onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);handlePayFile(e.dataTransfer.files[0]);}}
              onClick={()=>fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e=>handlePayFile(e.target.files[0])}/>
              <FileSpreadsheet size={32} className="mx-auto text-apple-blue mb-2 opacity-70"/>
              <p className="font-medium text-apple-text text-sm">Drop your Excel file here or click to browse</p>
              <p className="text-xs text-apple-gray-4 mt-1">Columns: Student Name, Amount, Date, Paid Date, Description, Payment Method, Status</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-apple-text">{importRows.length} payment{importRows.length!==1?'s':''} ready to import</p>
                <button onClick={()=>{setImportRows([]);setImportErrors([]);}} className="text-xs text-apple-gray-4 hover:text-apple-red flex items-center gap-1"><X size={12}/> Clear</button>
              </div>
              {importErrors.length>0 && (
                <div className="bg-orange-50 border-l-4 border-apple-orange p-3 rounded-apple-sm space-y-1">
                  <p className="text-xs font-medium text-apple-text">{importErrors.length} issue{importErrors.length!==1?'s':''} found</p>
                  {importErrors.map((e,i)=><p key={i} className="text-xs text-apple-gray-5">• {e}</p>)}
                </div>
              )}
              <div className="overflow-x-auto border border-apple-gray-2 rounded-apple-sm">
                <table className="w-full text-xs">
                  <thead><tr className="bg-apple-gray border-b border-apple-gray-2">
                    {['Student','Amount','Date','Paid Date','Method','Status'].map(h=><th key={h} className="text-left px-3 py-2 text-apple-gray-5 font-semibold uppercase text-[10px] whitespace-nowrap">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-apple-gray-2/60">
                    {importRows.slice(0,15).map((r,i)=>(
                      <tr key={i} className="hover:bg-apple-gray/40">
                        <td className="px-3 py-2 text-apple-text">{r.student_name}</td>
                        <td className="px-3 py-2 text-apple-text font-medium">₹{r.amount}</td>
                        <td className="px-3 py-2 text-apple-text">{r.date}</td>
                        <td className="px-3 py-2 text-apple-text">{r.paid_date||'—'}</td>
                        <td className="px-3 py-2 text-apple-text">{r.payment_method||'Cash'}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${(r.status||'paid')==='paid'?'bg-green-100 text-apple-green':(r.status||'')==='overdue'?'bg-red-100 text-apple-red':'bg-orange-100 text-apple-orange'}`}>{r.status||'paid'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importRows.length>15 && <p className="text-xs text-apple-gray-5 px-3 py-2 border-t border-apple-gray-2">… and {importRows.length-15} more</p>}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-apple-gray-2">
          <button className="btn-secondary" onClick={()=>setImportOpen(false)}>Cancel</button>
          {importRows.length>0 && <button className="btn-primary flex items-center gap-1.5" onClick={doImport} disabled={importing||importErrors.length>0}><Upload size={13}/>{importing?'Importing…':`Import ${importRows.length} Payments`}</button>}
        </div>
      </Modal>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {label:'Total Pending',val:`${currency}${(stats.total_pending||0).toLocaleString()}`,bg:'bg-orange-50',text:'text-apple-orange'},
          {label:'Overdue',val:`${currency}${(stats.total_overdue||0).toLocaleString()}`,bg:'bg-red-50',text:'text-apple-red'},
          {label:'This Month',val:`${currency}${(stats.paid_this_month||0).toLocaleString()}`,bg:'bg-green-50',text:'text-apple-green'},
          {label:'Overdue Students',val:`${stats.overdue_count||0}`,bg:'bg-apple-blue-light',text:'text-apple-blue'},
        ].map(s=>(
          <div key={s.label} className={`card ${s.bg} border-0`}>
            <div className={`text-xl font-bold ${s.text}`}>{s.val}</div>
            <div className="text-xs text-apple-gray-5 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center">
        <Filter size={13} className="text-apple-gray-4 hidden sm:block"/>
        <select className="input text-sm bg-apple-gray" value={filter.status} onChange={e=>setFilter(f=>({...f,status:e.target.value}))}>
          <option value="">All Status</option><option value="pending">Pending</option><option value="overdue">Overdue</option><option value="paid">Paid</option>
        </select>
        <select className="input text-sm bg-apple-gray" value={filter.month} onChange={e=>setFilter(f=>({...f,month:e.target.value}))}>
          <option value="">All Months</option>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
        </select>
        <select className="input text-sm bg-apple-gray" value={filter.year} onChange={e=>setFilter(f=>({...f,year:e.target.value}))}>
          {[2023,2024,2025,2026].map(y=><option key={y}>{y}</option>)}
        </select>
        <button className="text-xs text-apple-blue col-span-2 sm:col-auto text-left" onClick={()=>setFilter({status:'',month:'',year:String(new Date().getFullYear())})}>Clear</button>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block card p-0 overflow-hidden">
        {payments.length===0 ? (
          <div className="text-center py-12"><IndianRupee size={28} className="mx-auto mb-2 text-apple-gray-3" strokeWidth={1.5}/><p className="text-sm text-apple-gray-5">No records found</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-apple-gray-2">
              {['Student','Amount','Month','Type','Status','Reminders',''].map(h=><th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-apple-gray-5 uppercase tracking-wide">{h}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-apple-gray-2/60">
              {payments.map(p=>(
                <tr key={p.id} className={`hover:bg-apple-gray/40 ${p.status==='overdue'?'bg-red-50/30':''}`}>
                  <td className="px-4 py-3"><div className="font-medium text-apple-text">{p.student_name}</div><div className="text-xs text-apple-gray-4">{p.description||'—'}</div></td>
                  <td className="px-4 py-3 font-semibold">{currency}{p.amount}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-apple-text text-sm">{monthLabel(p.due_date)}</div>
                    {p.paid_date&&<div className="text-xs text-apple-green">Paid {new Date(p.paid_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div>}
                  </td>
                  <td className="px-4 py-3">{typeBadge(p.payment_method)}</td>
                  <td className="px-4 py-3">{badge(p.status)}</td>
                  <td className="px-4 py-3 text-xs text-apple-gray-4">{p.reminder_count>0?`${p.reminder_count} sent`:'—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {p.status!=='paid'&&<>
                        <button onClick={()=>{setSel(p);setMarkOpen(true);}} className="p-1.5 hover:bg-green-50 rounded-lg text-apple-gray-4 hover:text-apple-green" title="Mark paid"><CheckCircle size={14}/></button>
                        {p.parent_email&&<button onClick={()=>handleRemind(p)} disabled={reminding===p.id} className="p-1.5 hover:bg-apple-blue-light rounded-lg text-apple-gray-4 hover:text-apple-blue" title="Remind"><Bell size={14}/></button>}
                      </>}
                      <button onClick={async()=>{ if(confirm('Delete this payment?')){ await api.deletePayment(p.id); load(); }}} className="p-1.5 hover:bg-red-50 rounded-lg text-apple-gray-4 hover:text-apple-red"><Trash2 size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {payments.length===0 ? (
          <div className="card text-center py-10"><IndianRupee size={28} className="mx-auto mb-2 text-apple-gray-3" strokeWidth={1.5}/><p className="text-sm text-apple-gray-5">No records</p></div>
        ) : payments.map(p=>(
          <div key={p.id} className={`card space-y-3 ${p.status==='overdue'?'bg-red-50/50':''}`}>
            <div className="flex items-start justify-between">
              <div><div className="font-semibold text-apple-text">{p.student_name}</div><div className="text-xs text-apple-gray-4 mt-0.5">{p.description||'—'}</div></div>
              <div className="text-right"><div className="font-bold text-lg text-apple-text">{currency}{p.amount}</div>{badge(p.status)}</div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-apple-gray-5 items-center">
              <span>Month: <span className="text-apple-text font-medium">{monthLabel(p.due_date)}</span></span>
              {p.paid_date&&<span>Paid: <span className="text-apple-green font-medium">{new Date(p.paid_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span></span>}
              {p.payment_method&&typeBadge(p.payment_method)}
              {p.reminder_count>0&&<span className="text-apple-blue">{p.reminder_count} reminder{p.reminder_count>1?'s':''}</span>}
            </div>
            {p.status!=='paid'&&(
              <div className="flex gap-2 pt-2 border-t border-apple-gray-2">
                <button onClick={()=>{setSel(p);setMarkOpen(true);}} className="flex-1 btn-success py-2 text-xs flex items-center justify-center gap-1"><CheckCircle size={13}/>Mark Paid</button>
                {p.parent_email&&<button onClick={()=>handleRemind(p)} disabled={reminding===p.id} className="flex-1 btn-secondary py-2 text-xs flex items-center justify-center gap-1 text-apple-blue"><Bell size={13}/>Remind</button>}
                <button onClick={async()=>{ if(confirm('Delete?')){ await api.deletePayment(p.id); load(); }}} className="p-2 hover:bg-red-50 rounded-apple-sm text-apple-gray-4 hover:text-apple-red"><Trash2 size={14}/></button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal isOpen={addOpen} onClose={()=>setAddOpen(false)} title="Add Payment"><AddModal students={students} onClose={()=>setAddOpen(false)} onDone={load}/></Modal>
      {sel&&<Modal isOpen={markOpen} onClose={()=>setMarkOpen(false)} title="Mark as Received"><MarkPaidModal payment={sel} onClose={()=>setMarkOpen(false)} onDone={load}/></Modal>}

      <Modal isOpen={bulkOpen} onClose={()=>{setBulkOpen(false);setBulkResult(null);}} title="Generate Monthly Fees">
        <div className="space-y-4">
          <p className="text-sm text-apple-gray-5">Creates fee records for all active students with a monthly fee set.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Month</label><select className="input" value={bulkForm.month} onChange={e=>setBulkForm(f=>({...f,month:e.target.value}))}>{MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select></div>
            <div><label className="label">Year</label><select className="input" value={bulkForm.year} onChange={e=>setBulkForm(f=>({...f,year:e.target.value}))}>{[2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select></div>
            <div><label className="label">Due Day</label><input type="number" min="1" max="28" className="input" value={bulkForm.due_day} onChange={e=>setBulkForm(f=>({...f,due_day:e.target.value}))}/></div>
          </div>
          {bulkResult&&<div className="bg-green-50 rounded-apple-sm p-3 text-sm border border-apple-green/20"><p className="font-semibold text-apple-green">Done!</p><p className="text-apple-gray-5 mt-1">Created: <strong>{bulkResult.created}</strong> · Skipped: <strong>{bulkResult.skipped}</strong></p></div>}
          <div className="flex justify-end gap-2 pt-2"><button className="btn-secondary" onClick={()=>{setBulkOpen(false);setBulkResult(null);}}>Close</button><button className="btn-primary" onClick={handleBulk} disabled={bulkLoading}>{bulkLoading?'Generating…':'Generate'}</button></div>
        </div>
      </Modal>
    </div>
  );
}
