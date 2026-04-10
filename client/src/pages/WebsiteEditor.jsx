import React, { useState, useEffect, useRef } from 'react';
import { Globe, Image, BookOpen, Phone, Star, Save, Plus, Trash2, ArrowUp, ArrowDown, Eye, Upload, Link, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const API = '/api/website';
const token = () => localStorage.getItem('auth_token');
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const TABS = [
  { id: 'hero',         label: 'Hero',         icon: Star },
  { id: 'about',        label: 'About',        icon: BookOpen },
  { id: 'gallery',      label: 'Gallery',      icon: Image },
  { id: 'programs',     label: 'Programs',     icon: Globe },
  { id: 'contact',      label: 'Contact',      icon: Phone },
  { id: 'testimonials', label: 'Testimonials', icon: Star },
];

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 999,
      display: 'flex', alignItems: 'center', gap: 10,
      background: type === 'success' ? '#1c1c1e' : '#ff3b30',
      color: '#fff', padding: '13px 20px', borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)', fontSize: 14, fontWeight: 500,
      animation: 'slideUp 0.25s ease',
    }}>
      {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</label>
      {hint && <p style={{ fontSize: 12, color: '#86868b', marginBottom: 8 }}>{hint}</p>}
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, multiline, rows = 3 }) {
  const style = {
    width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e8e8ed',
    fontSize: 14, color: '#1d1d1f', background: '#f5f5f7', outline: 'none',
    fontFamily: 'inherit', resize: multiline ? 'vertical' : 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };
  if (multiline) return (
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      rows={rows} style={style}
      onFocus={e => e.target.style.borderColor = '#0071e3'}
      onBlur={e => e.target.style.borderColor = '#e8e8ed'} />
  );
  return (
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={style}
      onFocus={e => e.target.style.borderColor = '#0071e3'}
      onBlur={e => e.target.style.borderColor = '#e8e8ed'} />
  );
}

function ImagePicker({ value, onChange, label = 'Image' }) {
  const [mode, setMode] = useState('url');
  const [urlInput, setUrlInput] = useState('');
  const fileRef = useRef();

  function handleUrl() {
    if (urlInput.trim()) { onChange(urlInput.trim()); setUrlInput(''); }
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onChange(ev.target.result);
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ border: '1px solid #e8e8ed', borderRadius: 10, overflow: 'hidden' }}>
      {/* Preview */}
      {value && (
        <div style={{ position: 'relative', background: '#000', maxHeight: 200, overflow: 'hidden' }}>
          <img src={value} alt={label} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block', opacity: 0.85 }} />
          <button onClick={() => onChange('')}
            style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>
            Remove
          </button>
        </div>
      )}
      {/* Controls */}
      <div style={{ padding: 12, background: '#fafafa' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {['url', 'upload'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: mode === m ? '#0071e3' : '#e8e8ed', color: mode === m ? '#fff' : '#1d1d1f' }}>
              {m === 'url' ? '🔗 Paste URL' : '📁 Upload File'}
            </button>
          ))}
        </div>
        {mode === 'url' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              onKeyDown={e => e.key === 'Enter' && handleUrl()}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: '1px solid #e8e8ed', fontSize: 13, background: '#fff', outline: 'none' }} />
            <button onClick={handleUrl}
              style={{ padding: '8px 14px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Set</button>
          </div>
        ) : (
          <div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            <button onClick={() => fileRef.current.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#e8e8ed', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
              <Upload size={14} /> Choose Image from Device
            </button>
            <p style={{ fontSize: 11, color: '#86868b', marginTop: 5, textAlign: 'center' }}>JPG, PNG, WEBP supported · Max ~10MB recommended</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── SECTION EDITORS ──────────────────────────────────────────

function HeroEditor({ s, set }) {
  return (
    <div>
      <Field label="Hero Title" hint="Use \n for a line break (e.g. Tritiya\nDance Studio)">
        <Input value={s.hero_title} onChange={v => set('hero_title', v)} placeholder="Tritiya\nDance Studio" />
      </Field>
      <Field label="Tagline (small text above title)">
        <Input value={s.hero_tagline} onChange={v => set('hero_tagline', v)} placeholder="Classical Indian Dance" />
      </Field>
      <Field label="Subtitle (below title)">
        <Input value={s.hero_subtitle} onChange={v => set('hero_subtitle', v)} placeholder="Bharatanatyam · Nagaram, Hyderabad" />
      </Field>
      <Field label="Primary Button Text">
        <Input value={s.hero_cta1} onChange={v => set('hero_cta1', v)} placeholder="Explore Programs" />
      </Field>
      <Field label="Secondary Button Text">
        <Input value={s.hero_cta2} onChange={v => set('hero_cta2', v)} placeholder="Get in Touch" />
      </Field>
      <Field label="Hero Background Image" hint="This is the large full-screen photo behind the title">
        <ImagePicker value={s.hero_image} onChange={v => set('hero_image', v)} label="Hero" />
      </Field>
    </div>
  );
}

function AboutEditor({ s, set }) {
  return (
    <div>
      <Field label="Section Heading" hint="Use \n for a line break">
        <Input value={s.about_heading} onChange={v => set('about_heading', v)} placeholder="Where ancient art\nfinds new voice." />
      </Field>
      <Field label="About Text (Paragraph 1)">
        <Input value={s.about_text} onChange={v => set('about_text', v)} multiline rows={4} />
      </Field>
      <Field label="About Text (Paragraph 2)">
        <Input value={s.about_text2} onChange={v => set('about_text2', v)} multiline rows={4} />
      </Field>
      <Field label="Instructor / Founder Name">
        <Input value={s.about_badge_name} onChange={v => set('about_badge_name', v)} placeholder="Revathi Krishna" />
      </Field>
      <Field label="Instructor Title">
        <Input value={s.about_badge_title} onChange={v => set('about_badge_title', v)} placeholder="Founder & Principal Instructor" />
      </Field>
      <Field label="About Section Photo" hint="The portrait photo shown next to the about text">
        <ImagePicker value={s.about_photo} onChange={v => set('about_photo', v)} label="About Photo" />
      </Field>
      <div style={{ borderTop: '1px solid #e8e8ed', paddingTop: 20, marginTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>Key Stats (shown below the about text)</p>
        {[1,2,3].map(n => (
          <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Field label={`Stat ${n} — Title`}>
              <Input value={s[`stat${n}_title`]} onChange={v => set(`stat${n}_title`, v)} placeholder={n===1?'Bharatanatyam':n===2?'Kuchipudi':'All ages'} />
            </Field>
            <Field label={`Stat ${n} — Subtitle`}>
              <Input value={s[`stat${n}_sub`]} onChange={v => set(`stat${n}_sub`, v)} placeholder={n===1?'Primary discipline':n===2?'Secondary discipline':'Beginners welcome'} />
            </Field>
          </div>
        ))}
      </div>
    </div>
  );
}

function GalleryEditor({ gallery, setGallery, toast }) {
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [altInput, setAltInput] = useState('');
  const [addMode, setAddMode] = useState('url');
  const fileRef = useRef();

  async function addImage(src, alt) {
    if (!src) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/gallery`, { method: 'POST', headers: headers(), body: JSON.stringify({ src, alt }) });
      const img = await res.json();
      if (!res.ok) throw new Error(img.error);
      setGallery(prev => [...prev, img]);
      toast('Image added!', 'success');
      setUrlInput(''); setAltInput('');
    } catch (e) { toast(e.message, 'error'); }
    setLoading(false);
  }

  async function deleteImage(id) {
    if (!confirm('Remove this photo from the gallery?')) return;
    const res = await fetch(`${API}/gallery/${id}`, { method: 'DELETE', headers: headers() });
    if (res.ok) setGallery(prev => prev.filter(g => g.id !== id));
    else toast('Failed to delete', 'error');
  }

  async function move(index, dir) {
    const arr = [...gallery];
    const swapIdx = index + dir;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[index], arr[swapIdx]] = [arr[swapIdx], arr[index]];
    setGallery(arr);
    await fetch(`${API}/gallery/reorder`, { method: 'PUT', headers: headers(), body: JSON.stringify({ order: arr.map(g => g.id) }) });
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => addImage(ev.target.result, altInput || file.name.replace(/\.[^.]+$/, ''));
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <Field label="Gallery Section Heading">
        <Input value="" onChange={() => {}} placeholder="Handled in settings below" />
      </Field>

      {/* Add image panel */}
      <div style={{ background: '#f5f5f7', borderRadius: 12, padding: 16, marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>+ Add New Photo</p>
        <Field label="Caption / Alt Text (optional)">
          <Input value={altInput} onChange={setAltInput} placeholder="e.g. Bharatanatyam performance on stage" />
        </Field>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {['url', 'upload'].map(m => (
            <button key={m} onClick={() => setAddMode(m)}
              style={{ padding: '6px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: addMode === m ? '#0071e3' : '#e8e8ed', color: addMode === m ? '#fff' : '#1d1d1f' }}>
              {m === 'url' ? '🔗 Paste URL' : '📁 Upload Photo'}
            </button>
          ))}
        </div>
        {addMode === 'url' ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com/dance-photo.jpg"
              onKeyDown={e => e.key === 'Enter' && addImage(urlInput.trim(), altInput)}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #e8e8ed', fontSize: 13, background: '#fff', outline: 'none' }} />
            <button onClick={() => addImage(urlInput.trim(), altInput)} disabled={loading || !urlInput.trim()}
              style={{ padding: '9px 16px', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: loading ? 0.6 : 1 }}>
              {loading ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />} Add
            </button>
          </div>
        ) : (
          <div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            <button onClick={() => fileRef.current.click()} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', background: '#0071e3', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%', opacity: loading ? 0.6 : 1 }}>
              {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
              {loading ? 'Uploading…' : 'Choose Photo from Device'}
            </button>
            <p style={{ fontSize: 11, color: '#86868b', marginTop: 5, textAlign: 'center' }}>JPG, PNG, WEBP · Larger files take a moment to upload</p>
          </div>
        )}
      </div>

      {/* Gallery grid */}
      {gallery.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f5f5f7', borderRadius: 12, color: '#86868b' }}>
          <Image size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No photos yet. Add your first photo above.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {gallery.map((img, i) => (
            <div key={img.id} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e8e8ed', background: '#fff' }}>
              <div style={{ position: 'relative', aspectRatio: '1', background: '#000' }}>
                <img src={img.src} alt={img.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: 4, right: 4 }}>
                  <button onClick={() => deleteImage(img.id)}
                    style={{ background: 'rgba(255,59,48,0.9)', border: 'none', color: '#fff', borderRadius: 6, padding: '3px 7px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <div style={{ position: 'absolute', top: 4, left: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: 5, padding: '3px 6px', cursor: 'pointer', opacity: i === 0 ? 0.3 : 1 }}>
                    <ArrowUp size={11} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === gallery.length - 1}
                    style={{ background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: 5, padding: '3px 6px', cursor: 'pointer', opacity: i === gallery.length - 1 ? 0.3 : 1 }}>
                    <ArrowDown size={11} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '7px 8px' }}>
                <p style={{ fontSize: 11, color: '#86868b', truncate: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {img.alt || `Photo ${i + 1}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramsEditor({ s, set }) {
  const programs = [1, 2, 3, 4];
  const EMOJI_OPTIONS = ['🌱', '🌿', '🪷', '🎭', '🎶', '🌸', '⭐', '🏆', '💫', '🎯', '🕉️', '🌺'];
  return (
    <div>
      <Field label="Programs Section Heading">
        <Input value={s.programs_heading} onChange={v => set('programs_heading', v)} placeholder="Every stage of the journey." />
      </Field>
      {programs.map(n => (
        <div key={n} style={{ background: '#f5f5f7', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>Program {n}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <Field label="Icon Emoji">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                {EMOJI_OPTIONS.map(e => (
                  <button key={e} onClick={() => set(`program${n}_icon`, e)}
                    style={{ fontSize: 20, background: s[`program${n}_icon`] === e ? '#0071e3' : '#e8e8ed', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                    {e}
                  </button>
                ))}
              </div>
              <Input value={s[`program${n}_icon`]} onChange={v => set(`program${n}_icon`, v)} placeholder="🌱" />
            </Field>
            <Field label="Level Badge">
              <Input value={s[`program${n}_level`]} onChange={v => set(`program${n}_level`, v)} placeholder="Beginner" />
            </Field>
          </div>
          <Field label="Program Title">
            <Input value={s[`program${n}_title`]} onChange={v => set(`program${n}_title`, v)} placeholder="Foundations" />
          </Field>
          <Field label="Description">
            <Input value={s[`program${n}_desc`]} onChange={v => set(`program${n}_desc`, v)} multiline rows={3} />
          </Field>
        </div>
      ))}
    </div>
  );
}

function ContactEditor({ s, set }) {
  return (
    <div>
      <Field label="Section Heading" hint="Use \n for a line break">
        <Input value={s.contact_heading} onChange={v => set('contact_heading', v)} placeholder="Begin your\njourney with us." />
      </Field>
      <Field label="Section Subtitle">
        <Input value={s.contact_text} onChange={v => set('contact_text', v)} multiline rows={2} />
      </Field>
      <Field label="Phone Number (with country code)">
        <Input value={s.contact_phone} onChange={v => set('contact_phone', v)} placeholder="+91 93983 50275" />
      </Field>
      <Field label="WhatsApp Number (digits only, e.g. 919398350275)">
        <Input value={s.contact_whatsapp} onChange={v => set('contact_whatsapp', v)} placeholder="919398350275" />
      </Field>
      <Field label="Address">
        <Input value={s.contact_address} onChange={v => set('contact_address', v)} placeholder="Nagaram, Hyderabad — 500083" />
      </Field>
      <Field label="Studio Hours">
        <Input value={s.contact_hours} onChange={v => set('contact_hours', v)} placeholder="Mon – Sat · 09:30 AM onwards" />
      </Field>
      <div style={{ borderTop: '1px solid #e8e8ed', paddingTop: 20, marginTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 12 }}>Quote Section</p>
        <Field label="Quote Text">
          <Input value={s.quote_text} onChange={v => set('quote_text', v)} placeholder='"Dance is the hidden language of the soul."' />
        </Field>
        <Field label="Quote Author">
          <Input value={s.quote_author} onChange={v => set('quote_author', v)} placeholder="— Martha Graham" />
        </Field>
        <Field label="Quote Background Image">
          <ImagePicker value={s.quote_image} onChange={v => set('quote_image', v)} label="Quote BG" />
        </Field>
      </div>
    </div>
  );
}

// ── TESTIMONIALS EDITOR ───────────────────────────────────────
function TestimonialsEditor({ toast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', role: '', text: '', stars: 5, photo: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/testimonials`, { headers: headers() });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { toast('Failed to load testimonials', 'error'); }
    setLoading(false);
  }

  async function save(item) {
    setSaving(item.id);
    try {
      const res = await fetch(`${API}/testimonials/${item.id}`, { method: 'PUT', headers: headers(), body: JSON.stringify(item) });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      setItems(prev => prev.map(t => t.id === item.id ? updated : t));
      toast('Saved!', 'success');
    } catch (e) { toast(e.message, 'error'); }
    setSaving(null);
  }

  async function add() {
    if (!newItem.name || !newItem.text) { toast('Name and text are required', 'error'); return; }
    try {
      const res = await fetch(`${API}/testimonials`, { method: 'POST', headers: headers(), body: JSON.stringify(newItem) });
      if (!res.ok) throw new Error('Failed to add');
      const created = await res.json();
      setItems(prev => [...prev, created]);
      setNewItem({ name: '', role: '', text: '', stars: 5, photo: '' });
      setAdding(false);
      toast('Testimonial added!', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm('Delete this testimonial?')) return;
    try {
      const res = await fetch(`${API}/testimonials/${id}`, { method: 'DELETE', headers: headers() });
      if (!res.ok) throw new Error('Delete failed');
      setItems(prev => prev.filter(t => t.id !== id));
      toast('Deleted', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  function updateItem(id, field, value) {
    setItems(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }

  const fieldStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #e8e8ed', fontSize: 13, color: '#1d1d1f', background: '#f5f5f7', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const btnStyle = (color) => ({ padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: color === 'blue' ? '#0071e3' : color === 'red' ? '#ff3b30' : '#e8e8ed', color: color === 'gray' ? '#1d1d1f' : '#fff' });

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: '#86868b' }}>Loading testimonials…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: '#86868b' }}>{items.length} testimonial{items.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setAdding(v => !v)} style={btnStyle('blue')}>
          {adding ? 'Cancel' : '+ Add Testimonial'}
        </button>
      </div>

      {adding && (
        <div style={{ background: '#f5f5f7', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #e8e8ed' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 16 }}>New Testimonial</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Name *</label>
              <input style={fieldStyle} value={newItem.name} onChange={e => setNewItem(v => ({ ...v, name: e.target.value }))} placeholder="e.g. Priya Sharma" /></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Role</label>
              <input style={fieldStyle} value={newItem.role} onChange={e => setNewItem(v => ({ ...v, role: e.target.value }))} placeholder="e.g. Parent · Beginner Batch" /></div>
          </div>
          <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Testimonial Text *</label>
            <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={3} value={newItem.text} onChange={e => setNewItem(v => ({ ...v, text: e.target.value }))} placeholder="What did they say?" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Stars (1–5)</label>
              <select style={fieldStyle} value={newItem.stars} onChange={e => setNewItem(v => ({ ...v, stars: parseInt(e.target.value) }))}>
                {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
              </select></div>
            <div><label style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Photo URL (optional)</label>
              <input style={fieldStyle} value={newItem.photo} onChange={e => setNewItem(v => ({ ...v, photo: e.target.value }))} placeholder="https://..." /></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={() => setAdding(false)} style={btnStyle('gray')}>Cancel</button>
            <button onClick={add} style={btnStyle('blue')}>Add Testimonial</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f5f5f7', borderRadius: 12, color: '#86868b' }}>
          <p style={{ fontSize: 14 }}>No testimonials yet. Add your first one above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map(item => (
            <div key={item.id} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e8e8ed' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Name</label>
                  <input style={fieldStyle} value={item.name || ''} onChange={e => updateItem(item.id, 'name', e.target.value)} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Role</label>
                  <input style={fieldStyle} value={item.role || ''} onChange={e => updateItem(item.id, 'role', e.target.value)} placeholder="Parent · Beginner Batch" /></div>
              </div>
              <div style={{ marginBottom: 12 }}><label style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Text</label>
                <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={3} value={item.text || ''} onChange={e => updateItem(item.id, 'text', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Stars</label>
                  <select style={fieldStyle} value={item.stars || 5} onChange={e => updateItem(item.id, 'stars', parseInt(e.target.value))}>
                    {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} ★</option>)}
                  </select></div>
                <div><label style={{ fontSize: 11, fontWeight: 600, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Photo URL</label>
                  <input style={fieldStyle} value={item.photo || ''} onChange={e => updateItem(item.id, 'photo', e.target.value)} placeholder="https://..." /></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => remove(item.id)} style={{ ...btnStyle('gray'), background: 'transparent', color: '#ff3b30', padding: '6px 0', fontSize: 13 }}>
                  <Trash2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />Delete
                </button>
                <button onClick={() => save(item)} disabled={saving === item.id} style={{ ...btnStyle('blue'), opacity: saving === item.id ? 0.7 : 1 }}>
                  {saving === item.id ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function WebsiteEditor() {
  const [activeTab, setActiveTab] = useState('hero');
  const [settings, setSettings] = useState({});
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToastState] = useState({ msg: '', type: 'success' });

  function showToast(msg, type = 'success') {
    setToastState({ msg, type });
    setTimeout(() => setToastState({ msg: '', type: 'success' }), 3000);
  }

  useEffect(() => {
    fetch(`${API}`, { headers: headers() })
      .then(r => r.json())
      .then(data => { setSettings(data.settings || {}); setGallery(data.gallery || []); })
      .catch(() => showToast('Failed to load settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  function setSetting(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/settings`, { method: 'POST', headers: headers(), body: JSON.stringify(settings) });
      if (!res.ok) throw new Error('Save failed');
      showToast('Changes saved! Your website is updated.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
    setSaving(false);
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12, color: '#86868b' }}>
      <Loader size={28} style={{ animation: 'spin 1s linear infinite' }} />
      <p style={{ fontSize: 14 }}>Loading website settings…</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: 4 }}>Website Editor</h1>
          <p style={{ fontSize: 14, color: '#86868b' }}>Customise every part of your public website at tritiya.in</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="https://tritiya.in" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: '#f5f5f7', color: '#1d1d1f', textDecoration: 'none', fontSize: 13, fontWeight: 500, border: '1px solid #e8e8ed' }}>
            <Eye size={14} /> Preview Site
          </a>
          <button onClick={save} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 8, background: '#0071e3', color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, background: '#f5f5f7', padding: 4, borderRadius: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', flex: 1, justifyContent: 'center',
              background: activeTab === id ? '#fff' : 'transparent',
              color: activeTab === id ? '#1d1d1f' : '#6e6e73',
              boxShadow: activeTab === id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '24px 24px 32px', border: '1px solid #e8e8ed', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        {activeTab === 'hero'         && <HeroEditor s={settings} set={setSetting} />}
        {activeTab === 'about'        && <AboutEditor s={settings} set={setSetting} />}
        {activeTab === 'gallery'      && <GalleryEditor gallery={gallery} setGallery={setGallery} toast={showToast} />}
        {activeTab === 'programs'     && <ProgramsEditor s={settings} set={setSetting} />}
        {activeTab === 'contact'      && <ContactEditor s={settings} set={setSetting} />}
        {activeTab === 'testimonials' && <TestimonialsEditor toast={showToast} />}

        {/* Bottom save */}
        {activeTab !== 'gallery' && activeTab !== 'testimonials' && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f5', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={save} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, background: '#0071e3', color: '#fff', border: 'none', fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <Toast msg={toast.msg} type={toast.type} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        textarea { font-family: inherit; }
      `}</style>
    </div>
  );
}
