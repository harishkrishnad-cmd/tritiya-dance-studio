import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, X, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../api';

const REQUIRED = ['name'];
const COLUMNS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'parent_name', label: 'Parent Name' },
  { key: 'parent_email', label: 'Parent Email' },
  { key: 'parent_phone', label: 'Parent Phone' },
  { key: 'date_of_birth', label: 'Date of Birth (YYYY-MM-DD)' },
  { key: 'join_date', label: 'Join Date (YYYY-MM-DD)' },
  { key: 'monthly_fee', label: 'Monthly Fee' },
  { key: 'notes', label: 'Notes' },
];

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    COLUMNS.map(c => c.label),
    ['Priya Sharma', 'Meena Sharma', 'meena@example.com', '9876543210', '2015-04-12', '2024-01-10', '1500', 'Beginner'],
    ['Ananya Rao', 'Sunita Rao', 'sunita@example.com', '9123456789', '2013-07-22', '2024-02-01', '1500', ''],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  XLSX.writeFile(wb, 'students_template.xlsx');
}

export default function Import() {
  const [rows, setRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  function parseFile(file) {
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
      // Normalise header keys: lowercase, underscores
      const normalised = raw.map(r => {
        const out = {};
        for (const [k, v] of Object.entries(r)) {
          const key = k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/,'');
          // Map label → key
          const col = COLUMNS.find(c => c.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/,'') === key || c.key === key);
          if (col) out[col.key] = String(v).trim();
        }
        return out;
      }).filter(r => r.name);

      // Validate
      const errs = [];
      normalised.forEach((r, i) => {
        REQUIRED.forEach(k => { if (!r[k]) errs.push(`Row ${i + 2}: "${k}" is required`); });
      });
      setRows(normalised);
      setErrors(errs);
    };
    reader.readAsBinaryString(file);
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { alert('Please upload an Excel (.xlsx/.xls) or CSV file'); return; }
    parseFile(file);
  }

  async function handleImport() {
    if (!rows.length || errors.length) return;
    setImporting(true);
    try {
      const r = await api.bulkImportStudents(rows);
      setResult({ success: true, count: r.imported, skipped: r.skipped });
      setRows([]);
    } catch (e) {
      setResult({ success: false, error: e.message });
    }
    setImporting(false);
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-apple-text tracking-tight">Import Students</h1>
        <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-1.5 text-sm">
          <Download size={13} /> Download Template
        </button>
      </div>

      {result && (
        <div className={`card flex items-start gap-3 ${result.success ? 'border-l-4 border-apple-green' : 'border-l-4 border-apple-red'}`}>
          {result.success
            ? <><CheckCircle size={18} className="text-apple-green mt-0.5 shrink-0"/><div><p className="font-medium text-apple-text">{result.count} student{result.count !== 1 ? 's' : ''} imported successfully</p>{result.skipped > 0 && <p className="text-xs text-apple-gray-5 mt-0.5">{result.skipped} rows skipped (already exist)</p>}</div></>
            : <><AlertCircle size={18} className="text-apple-red mt-0.5 shrink-0"/><p className="text-apple-text">{result.error}</p></>
          }
        </div>
      )}

      {/* Drop zone */}
      {!rows.length && (
        <div
          className={`card border-2 border-dashed transition-all text-center py-12 cursor-pointer ${dragOver ? 'border-apple-blue bg-blue-50' : 'border-apple-gray-2 hover:border-apple-blue/40'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          <FileSpreadsheet size={36} className="mx-auto text-apple-blue mb-3 opacity-70" />
          <p className="font-medium text-apple-text">Drop your Excel file here</p>
          <p className="text-sm text-apple-gray-5 mt-1">or click to browse — .xlsx, .xls, .csv supported</p>
          <p className="text-xs text-apple-gray-4 mt-3">Download the template above to see the required format</p>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="card border-l-4 border-apple-orange space-y-1">
          <p className="font-medium text-apple-text flex items-center gap-2"><AlertCircle size={14} className="text-apple-orange"/> {errors.length} validation issue{errors.length !== 1 ? 's' : ''} found</p>
          <ul className="text-xs text-apple-gray-5 space-y-0.5 pl-1">
            {errors.map((e, i) => <li key={i}>• {e}</li>)}
          </ul>
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-apple-text flex items-center gap-2">
              <Users size={14} className="text-apple-blue"/> {rows.length} student{rows.length !== 1 ? 's' : ''} ready to import
            </p>
            <button onClick={() => { setRows([]); setErrors([]); setResult(null); }} className="text-xs text-apple-gray-4 hover:text-apple-red flex items-center gap-1">
              <X size={12}/> Clear
            </button>
          </div>
          <div className="overflow-x-auto rounded-apple-sm border border-apple-gray-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-apple-gray border-b border-apple-gray-2">
                  <th className="text-left px-3 py-2 text-apple-gray-5 font-semibold uppercase tracking-wide text-[10px]">#</th>
                  {COLUMNS.filter(c => rows.some(r => r[c.key])).map(c => (
                    <th key={c.key} className="text-left px-3 py-2 text-apple-gray-5 font-semibold uppercase tracking-wide text-[10px] whitespace-nowrap">{c.key.replace(/_/g,' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-gray-2/60">
                {rows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="hover:bg-apple-gray/40">
                    <td className="px-3 py-2 text-apple-gray-4">{i + 1}</td>
                    {COLUMNS.filter(c => rows.some(row => row[c.key])).map(c => (
                      <td key={c.key} className="px-3 py-2 text-apple-text whitespace-nowrap">{r[c.key] || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 20 && <p className="text-xs text-apple-gray-5 px-3 py-2 border-t border-apple-gray-2">… and {rows.length - 20} more rows</p>}
          </div>
          <div className="flex justify-end pt-1">
            <button onClick={handleImport} disabled={importing || errors.length > 0} className="btn-primary flex items-center gap-1.5">
              <Upload size={13}/>{importing ? 'Importing…' : `Import ${rows.length} Students`}
            </button>
          </div>
        </div>
      )}

      {/* Guide */}
      {!rows.length && (
        <div className="card space-y-3">
          <h2 className="font-semibold text-sm text-apple-text">How it works</h2>
          <ol className="space-y-2 text-sm text-apple-gray-5">
            <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-apple-blue text-white text-xs flex items-center justify-center shrink-0 font-medium">1</span>Download the template Excel file using the button above</li>
            <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-apple-blue text-white text-xs flex items-center justify-center shrink-0 font-medium">2</span>Fill in your students' details — Name is required, all other fields are optional</li>
            <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-apple-blue text-white text-xs flex items-center justify-center shrink-0 font-medium">3</span>Upload the filled file here — preview and verify before importing</li>
            <li className="flex gap-2"><span className="w-5 h-5 rounded-full bg-apple-blue text-white text-xs flex items-center justify-center shrink-0 font-medium">4</span>Parent login credentials are auto-generated and sent by email on import</li>
          </ol>
        </div>
      )}
    </div>
  );
}
