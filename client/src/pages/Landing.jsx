import React, { useState, useEffect, useRef } from 'react';

const DEFAULT_GALLERY = [
  { id: 'a', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Bharatanatyam_with_music.jpg/900px-Bharatanatyam_with_music.jpg', alt: 'Bharatanatyam performer with live music' },
  { id: 'b', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/A_Vibrant_Bharatanatyam_Group_Interpretation.jpg/900px-A_Vibrant_Bharatanatyam_Group_Interpretation.jpg', alt: 'Group Bharatanatyam performance' },
  { id: 'c', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Bharatanatyam_poses.jpg/700px-Bharatanatyam_poses.jpg', alt: 'Bharatanatyam classical poses' },
  { id: 'd', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Bharatanatyam_by_Amrita_Lahiri_%28104%29.jpg/700px-Bharatanatyam_by_Amrita_Lahiri_%28104%29.jpg', alt: 'Bharatanatyam dancer in full costume' },
  { id: 'e', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Bharatanatyam_by_Amrita_Lahiri_%2820%29.jpg/700px-Bharatanatyam_by_Amrita_Lahiri_%2820%29.jpg', alt: 'Classical Bharatanatyam performance' },
  { id: 'f', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Bharat_Natyam_dance_performance.jpg/700px-Bharat_Natyam_dance_performance.jpg', alt: 'Bharatanatyam stage performance' },
  { id: 'g', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/An_Indian_Bharatanatyam_Artist_in_Poland.jpg/700px-An_Indian_Bharatanatyam_Artist_in_Poland.jpg', alt: 'Bharatanatyam artist' },
  { id: 'h', src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Bharata_Natyam_Performance_DS.jpg/700px-Bharata_Natyam_Performance_DS.jpg', alt: 'Bharata Natyam performance on stage' },
];

const DEFAULTS = {
  hero_title: 'Tritiya\nDance Studio',
  hero_subtitle: 'Bharatanatyam · Nagaram, Hyderabad',
  hero_tagline: 'Classical Indian Dance',
  hero_image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Bharatanatyam_poses.jpg/1200px-Bharatanatyam_poses.jpg',
  hero_cta1: 'Explore Programs',
  hero_cta2: 'Get in Touch',
  about_heading: 'Where ancient art\nfinds new voice.',
  about_text: 'Tritiya Dance Studio is a classical Bharatanatyam academy rooted in the heart of Nagaram, Hyderabad. Founded and led by Revathi Krishna, the studio is dedicated to preserving the grammar, grace, and devotion of this centuries-old art form.',
  about_text2: 'From young beginners discovering their first steps to advanced students preparing for arangetram, every student receives personalised, rigorous training that honours tradition while nurturing expression.',
  about_badge_name: 'Revathi Krishna',
  about_badge_title: 'Founder & Principal Instructor',
  about_photo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Bharatanatyam_by_Amrita_Lahiri_%28104%29.jpg/800px-Bharatanatyam_by_Amrita_Lahiri_%28104%29.jpg',
  gallery_heading: 'The art, captured.',
  programs_heading: 'Every stage of the journey.',
  contact_heading: 'Begin your\njourney with us.',
  contact_text: 'Reach out to Revathi Krishna to learn more about our programs, schedule a demo class, or enroll your child.',
  contact_phone: '+91 93983 50275',
  contact_whatsapp: '919398350275',
  contact_address: 'Nagaram, Hyderabad — 500083',
  contact_hours: 'Mon – Sat · 09:30 AM onwards',
  quote_text: '"Dance is the hidden language of the soul."',
  quote_author: '— Martha Graham',
  quote_image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/A_Vibrant_Bharatanatyam_Group_Interpretation.jpg/1400px-A_Vibrant_Bharatanatyam_Group_Interpretation.jpg',
  program1_icon: '🌱', program1_level: 'Beginner', program1_title: 'Foundations',
  program1_desc: 'Introduction to Bharatanatyam — Adavus, basic footwork, posture, and the fundamentals of Nritta. Perfect for ages 5 and above.',
  program2_icon: '🌿', program2_level: 'Intermediate', program2_title: 'Classical Training',
  program2_desc: 'Deeper exploration of Abhinaya, Varnam, and Keertanam. Students develop expressional technique and rhythmic precision.',
  program3_icon: '🪷', program3_level: 'Advanced', program3_title: 'Advanced & Arangetram',
  program3_desc: 'Comprehensive preparation for the solo debut performance. Rigorous technique, repertoire building, and stage presence.',
  program4_icon: '🎭', program4_level: 'All Levels', program4_title: 'Kuchipudi',
  program4_desc: 'Classical Kuchipudi training alongside Bharatanatyam, exploring the expressive storytelling traditions of Andhra Pradesh.',
};

function s(key, data) {
  return (data && data[key]) ? data[key] : DEFAULTS[key] || '';
}

function nl(text) {
  return (text || '').split('\n').map((line, i, arr) => (
    <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
  ));
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  useEffect(() => {
    fetch('/api/website/public')
      .then(r => r.json())
      .then(res => {
        setData(res.settings || {});
        setGallery(res.gallery && res.gallery.length > 0 ? res.gallery : DEFAULT_GALLERY);
      })
      .catch(() => setGallery(DEFAULT_GALLERY));
    fetch('/api/website/testimonials').then(r => r.json()).then(setTestimonials).catch(() => {});
  }, []);

  useEffect(() => {
    if (testimonials.length <= 1) return;
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % testimonials.length), 5000);
    return () => clearInterval(t);
  }, [testimonials.length]);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 60); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function scrollTo(id) {
    setMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const programs = [1,2,3,4].map(n => ({
    icon: s(`program${n}_icon`, data),
    level: s(`program${n}_level`, data),
    title: s(`program${n}_title`, data),
    desc: s(`program${n}_desc`, data),
  }));

  // Assign layout spans to gallery images
  const galleryWithSpans = gallery.map((img, i) => ({
    ...img,
    span: i === 0 ? 'tall' : i === 1 ? 'wide' : i === 5 ? 'tall' : 'normal',
  }));

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif", background: '#0a0a0a', color: '#f5f5f7', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(10,10,10,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : 'none',
        transition: 'all 0.4s ease',
        padding: '0 max(24px, calc((100vw - 1100px)/2))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: 0 }}>
            <span style={{ fontSize: 22 }}>🪷</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7', letterSpacing: '-0.3px' }}>Tritiya Dance Studio</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="desktop-nav">
            {['about','gallery','programs','contact'].map(id => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ background: 'none', border: 'none', color: 'rgba(245,245,247,0.75)', fontSize: 13, cursor: 'pointer', padding: 0, textTransform: 'capitalize', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color='#f5f5f7'} onMouseLeave={e => e.target.style.color='rgba(245,245,247,0.75)'}>
                {id.charAt(0).toUpperCase()+id.slice(1)}
              </button>
            ))}
            <a href="/parent" style={{ fontSize: 13, color: 'rgba(245,245,247,0.75)', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color='#f5f5f7'} onMouseLeave={e => e.target.style.color='rgba(245,245,247,0.75)'}>
              Parent Portal
            </a>
            <a href="/student" style={{ fontSize: 13, fontWeight: 500, color: '#0a0a0a', background: '#f5f5f7', padding: '7px 16px', borderRadius: 980, textDecoration: 'none', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.target.style.opacity='0.85'} onMouseLeave={e => e.target.style.opacity='1'}>
              Student Portal
            </a>
          </div>
          <button onClick={() => setMenuOpen(v => !v)} className="mobile-menu-btn"
            style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#f5f5f7' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              {menuOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></>}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div style={{ padding: '16px 0 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {['about','gallery','programs','contact'].map(id => (
              <button key={id} onClick={() => scrollTo(id)}
                style={{ background: 'none', border: 'none', color: 'rgba(245,245,247,0.8)', fontSize: 17, cursor: 'pointer', padding: '10px 0', textAlign: 'left', textTransform: 'capitalize' }}>
                {id.charAt(0).toUpperCase()+id.slice(1)}
              </button>
            ))}
            <a href="/parent" style={{ color: 'rgba(245,245,247,0.8)', fontSize: 17, textDecoration: 'none', padding: '10px 0' }}>Parent Portal</a>
            <a href="/student" style={{ color: '#0a0a0a', background: '#f5f5f7', fontSize: 15, fontWeight: 500, textDecoration: 'none', padding: '10px 20px', borderRadius: 980, marginTop: 8, display: 'inline-block', width: 'fit-content' }}>Student Portal</a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100svh', minHeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${s('hero_image', data)})`, backgroundSize: 'cover', backgroundPosition: 'center 20%', filter: 'brightness(0.35)', transform: 'scale(1.04)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,10,10,0.2) 0%, rgba(10,10,10,0.0) 40%, rgba(10,10,10,0.7) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 2, padding: '0 24px', maxWidth: 800 }}>
          <p style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.2em', color: 'rgba(245,245,247,0.6)', textTransform: 'uppercase', marginBottom: 20 }}>{s('hero_tagline', data)}</p>
          <h1 style={{ fontSize: 'clamp(44px, 9vw, 96px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.0, color: '#f5f5f7', margin: '0 0 24px' }}>
            {nl(s('hero_title', data))}
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2.5vw, 21px)', fontWeight: 300, color: 'rgba(245,245,247,0.7)', letterSpacing: '-0.01em', marginBottom: 40, lineHeight: 1.5 }}>{s('hero_subtitle', data)}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => scrollTo('programs')}
              style={{ padding: '14px 28px', borderRadius: 980, fontSize: 15, fontWeight: 500, background: '#f5f5f7', color: '#0a0a0a', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity='0.88'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
              {s('hero_cta1', data)}
            </button>
            <button onClick={() => scrollTo('contact')}
              style={{ padding: '14px 28px', borderRadius: 980, fontSize: 15, fontWeight: 500, background: 'rgba(245,245,247,0.12)', color: '#f5f5f7', border: '1px solid rgba(245,245,247,0.25)', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(245,245,247,0.2)'} onMouseLeave={e => e.currentTarget.style.background='rgba(245,245,247,0.12)'}>
              {s('hero_cta2', data)}
            </button>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(245,245,247,0.35)', textTransform: 'uppercase' }}>Scroll</span>
            <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(245,245,247,0.4), rgba(245,245,247,0))', animation: 'fadeInDown 1.5s ease infinite' }} />
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div style={{ background: '#111', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a', padding: '16px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 64, animation: 'marquee 28s linear infinite', whiteSpace: 'nowrap', width: 'max-content' }}>
          {Array(4).fill(['Classical','Devotional','Timeless','Bharatanatyam','Abhinaya','Nritta','Nritya','Nagaram, Hyderabad']).flat().map((text, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.2em', textTransform: 'uppercase', color: i%2===0 ? 'rgba(245,245,247,0.35)' : 'rgba(245,245,247,0.15)' }}>{text}</span>
          ))}
        </div>
      </div>

      {/* ── ABOUT ── */}
      <section id="about" style={{ padding: 'clamp(80px, 12vw, 160px) max(24px, calc((100vw - 1100px)/2))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 80, alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(245,245,247,0.4)', textTransform: 'uppercase', marginBottom: 16 }}>About the Studio</p>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#f5f5f7', marginBottom: 28 }}>
              {nl(s('about_heading', data))}
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.75, color: 'rgba(245,245,247,0.6)', marginBottom: 20, fontWeight: 300 }}>{s('about_text', data)}</p>
            <p style={{ fontSize: 17, lineHeight: 1.75, color: 'rgba(245,245,247,0.6)', fontWeight: 300 }}>{s('about_text2', data)}</p>
            <div style={{ marginTop: 40, display: 'flex', gap: 40, flexWrap: 'wrap' }}>
              {[['Bharatanatyam','Primary discipline'],['Kuchipudi','Secondary discipline'],['All ages','Beginners welcome']].map(([title,sub]) => (
                <div key={title}><p style={{ fontSize: 22, fontWeight: 700, color: '#f5f5f7', letterSpacing: '-0.03em' }}>{title}</p><p style={{ fontSize: 13, color: 'rgba(245,245,247,0.4)', marginTop: 2 }}>{sub}</p></div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6)', aspectRatio: '3/4', maxWidth: 420, margin: '0 auto' }}>
              <img src={s('about_photo', data)} alt={s('about_badge_name', data)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
            </div>
            <div style={{ position: 'absolute', bottom: 28, right: 0, background: 'rgba(245,245,247,0.05)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(245,245,247,0.1)', borderRadius: 14, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#f5f5f7', letterSpacing: '-0.01em' }}>{s('about_badge_name', data)}</p>
              <p style={{ fontSize: 11, color: 'rgba(245,245,247,0.45)', marginTop: 2 }}>{s('about_badge_title', data)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section id="gallery" style={{ padding: 'clamp(60px, 8vw, 120px) max(24px, calc((100vw - 1200px)/2))' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(245,245,247,0.4)', textTransform: 'uppercase', marginBottom: 12 }}>Gallery</p>
          <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f5f7' }}>{s('gallery_heading', data)}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="gallery-grid">
          {galleryWithSpans.map((photo, i) => (
            <div key={photo.id || i} style={{ borderRadius: 12, overflow: 'hidden', gridRow: photo.span==='tall' ? 'span 2' : 'span 1', gridColumn: photo.span==='wide' ? 'span 2' : 'span 1', aspectRatio: photo.span==='tall' ? '3/4' : photo.span==='wide' ? '16/9' : '1/1', background: '#111', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', transition: 'transform 0.4s ease, box-shadow 0.4s ease', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.transform='scale(1.02)'; e.currentTarget.style.boxShadow='0 12px 40px rgba(0,0,0,0.6)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 24px rgba(0,0,0,0.4)'; }}>
              <img src={photo.src} alt={photo.alt} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── PROGRAMS ── */}
      <section id="programs" style={{ padding: 'clamp(60px, 8vw, 120px) max(24px, calc((100vw - 1100px)/2))', background: '#0d0d0d' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(245,245,247,0.4)', textTransform: 'uppercase', marginBottom: 12 }}>Programs</p>
          <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f5f7' }}>{s('programs_heading', data)}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {programs.map(prog => (
            <div key={prog.title} style={{ background: '#141414', border: '1px solid rgba(245,245,247,0.07)', borderRadius: 18, padding: '32px 28px', transition: 'border-color 0.3s, transform 0.3s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(245,245,247,0.18)'; e.currentTarget.style.transform='translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(245,245,247,0.07)'; e.currentTarget.style.transform='translateY(0)'; }}>
              <span style={{ fontSize: 32, display: 'block', marginBottom: 20 }}>{prog.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(245,245,247,0.35)', display: 'block', marginBottom: 8 }}>{prog.level}</span>
              <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#f5f5f7', marginBottom: 12 }}>{prog.title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: 'rgba(245,245,247,0.5)', fontWeight: 300 }}>{prog.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 52 }}>
          <button onClick={() => scrollTo('contact')}
            style={{ padding: '14px 32px', borderRadius: 980, fontSize: 15, fontWeight: 500, background: '#f5f5f7', color: '#0a0a0a', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity='0.88'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
            Enquire About Enrollment
          </button>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      {testimonials.length > 0 && (
      <section style={{ background: '#0d0d0f', padding: 'clamp(60px, 8vw, 100px) max(24px, calc((100vw - 1100px)/2))', overflow: 'hidden' }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(245,245,247,0.4)', textTransform: 'uppercase', marginBottom: 12 }}>Testimonials</p>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f5f7', marginBottom: 48, lineHeight: 1.15 }}>Hear from our community.</h2>

        <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto' }}>
          {/* Card */}
          <div style={{ background: '#1c1c1e', borderRadius: 24, padding: 'clamp(28px, 5vw, 48px)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', minHeight: 220, transition: 'all 0.4s ease' }}>
            {/* Stars */}
            <div style={{ marginBottom: 20 }}>
              {Array.from({ length: testimonials[testimonialIdx]?.stars || 5 }).map((_, i) => (
                <span key={i} style={{ color: '#ffd60a', fontSize: 18, marginRight: 3 }}>★</span>
              ))}
            </div>
            {/* Quote mark */}
            <div style={{ fontSize: 60, color: 'rgba(245,245,247,0.08)', lineHeight: 1, marginBottom: -12, fontFamily: 'Georgia, serif' }}>"</div>
            {/* Text */}
            <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'rgba(245,245,247,0.85)', lineHeight: 1.75, fontStyle: 'italic', marginBottom: 28 }}>
              {testimonials[testimonialIdx]?.text}
            </p>
            {/* Person */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {testimonials[testimonialIdx]?.photo ? (
                <img src={testimonials[testimonialIdx].photo} alt={testimonials[testimonialIdx].name}
                  style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(245,245,247,0.1)' }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(245,245,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'rgba(245,245,247,0.6)' }}>
                  {(testimonials[testimonialIdx]?.name || '?')[0]}
                </div>
              )}
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#f5f5f7' }}>{testimonials[testimonialIdx]?.name}</p>
                <p style={{ fontSize: 13, color: 'rgba(245,245,247,0.45)', marginTop: 2 }}>{testimonials[testimonialIdx]?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          {testimonials.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setTestimonialIdx(i)}
                    style={{ width: i === testimonialIdx ? 24 : 8, height: 8, borderRadius: 4, background: i === testimonialIdx ? '#f5f5f7' : 'rgba(245,245,247,0.2)', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setTestimonialIdx(i => (i - 1 + testimonials.length) % testimonials.length)}
                  style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,245,247,0.1)', border: '1px solid rgba(245,245,247,0.15)', color: '#f5f5f7', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                <button onClick={() => setTestimonialIdx(i => (i + 1) % testimonials.length)}
                  style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(245,245,247,0.1)', border: '1px solid rgba(245,245,247,0.15)', color: '#f5f5f7', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
              </div>
            </div>
          )}
        </div>
      </section>
      )}

      {/* ── E-LEARNING SECTION ── */}
<section id="elearning" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111827 50%, #0a0a0a 100%)', padding: 'clamp(70px,9vw,110px) max(24px, calc((100vw - 1100px)/2))', position: 'relative', overflow: 'hidden' }}>
  {/* Decorative glow */}
  <div style={{ position: 'absolute', top: '20%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,113,227,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

  <div style={{ position: 'relative', zIndex: 1 }}>
    <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.2em', color: '#0071e3', textTransform: 'uppercase', marginBottom: 12 }}>Digital Learning Hub</p>
    <h2 style={{ fontSize: 'clamp(30px, 4.5vw, 52px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f5f7', marginBottom: 16, lineHeight: 1.1, maxWidth: 640 }}>
      One-of-a-kind learning,<br/>beyond the classroom.
    </h2>
    <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'rgba(245,245,247,0.55)', lineHeight: 1.7, marginBottom: 52, maxWidth: 560 }}>
      Tritiya Dance Studio brings classical Bharatanatyam into the digital age. Students access structured course materials, complete knowledge quizzes, earn badges and points — and receive printable certificates upon course completion.
    </p>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 44 }}>
      {[
        { icon: '📚', title: 'Structured Courses', desc: 'Curated video lessons, reading materials and practice guides — organised by level from beginner to arangetram.' },
        { icon: '📝', title: 'Quizzes & Assessments', desc: 'Test your theoretical knowledge with teacher-crafted quizzes after each course module. Instant scoring and feedback.' },
        { icon: '🏅', title: 'Badges & Points', desc: 'Earn achievement badges and accumulate points as you progress — a gamified way to stay motivated and track growth.' },
        { icon: '🎓', title: 'Official Certificates', desc: 'Pass a course and receive a beautifully designed, printable certificate signed by Revathi Krishna — a milestone to cherish.' },
      ].map(f => (
        <div key={f.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '28px 24px', backdropFilter: 'blur(10px)', transition: 'border-color 0.3s, background 0.3s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,113,227,0.4)'; e.currentTarget.style.background='rgba(0,113,227,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}>
          <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f7', marginBottom: 8, letterSpacing: '-0.01em' }}>{f.title}</h3>
          <p style={{ fontSize: 13.5, color: 'rgba(245,245,247,0.5)', lineHeight: 1.65 }}>{f.desc}</p>
        </div>
      ))}
    </div>

    <a href="/student" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', background: '#0071e3', color: '#fff', borderRadius: 980, fontSize: 15, fontWeight: 500, textDecoration: 'none', transition: 'opacity 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.opacity='0.85'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
      Enter Learning Hub →
    </a>
  </div>
</section>

      {/* ── CINEMATIC QUOTE ── */}
      <section style={{ position: 'relative', height: 'clamp(320px, 50vw, 600px)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={s('quote_image', data)} alt="Dance" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.3)' }} loading="lazy" />
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px' }}>
          <p style={{ fontSize: 'clamp(20px, 4vw, 42px)', fontWeight: 600, letterSpacing: '-0.02em', color: '#f5f5f7', lineHeight: 1.3, maxWidth: 700 }}>{s('quote_text', data)}</p>
          <p style={{ fontSize: 14, color: 'rgba(245,245,247,0.4)', marginTop: 16, letterSpacing: '0.08em' }}>{s('quote_author', data)}</p>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ padding: 'clamp(80px, 10vw, 140px) max(24px, calc((100vw - 1100px)/2))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 80, alignItems: 'start' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.18em', color: 'rgba(245,245,247,0.4)', textTransform: 'uppercase', marginBottom: 16 }}>Contact</p>
            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f5f7', marginBottom: 24, lineHeight: 1.15 }}>{nl(s('contact_heading', data))}</h2>
            <p style={{ fontSize: 17, lineHeight: 1.75, color: 'rgba(245,245,247,0.55)', fontWeight: 300 }}>{s('contact_text', data)}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.35h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, label:'Phone', value: s('contact_phone', data), href: `tel:${s('contact_phone', data)}` },
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>, label:'Location', value: s('contact_address', data), href: `https://maps.google.com/?q=${encodeURIComponent(s('contact_address', data))}` },
              { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, label:'Hours', value: s('contact_hours', data), href: null },
            ].map(item => (
              <a key={item.label} href={item.href || '#'} target={item.href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '22px 24px', borderRadius: 16, background: '#141414', border: '1px solid rgba(245,245,247,0.07)', textDecoration: 'none', transition: 'border-color 0.25s, transform 0.25s' }}
                onMouseEnter={e => { if(item.href){e.currentTarget.style.borderColor='rgba(245,245,247,0.18)';e.currentTarget.style.transform='translateX(6px)';} }}
                onMouseLeave={e => {e.currentTarget.style.borderColor='rgba(245,245,247,0.07)';e.currentTarget.style.transform='translateX(0)';}}>
                <div style={{ color: 'rgba(245,245,247,0.4)', flexShrink: 0 }}>{item.icon}</div>
                <div>
                  <p style={{ fontSize: 11, color: 'rgba(245,245,247,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</p>
                  <p style={{ fontSize: 16, color: '#f5f5f7', fontWeight: 400, letterSpacing: '-0.01em' }}>{item.value}</p>
                </div>
              </a>
            ))}
            <a href={`https://wa.me/${s('contact_whatsapp', data)}?text=Hello%2C%20I%27m%20interested%20in%20Bharatanatyam%20classes%20at%20Tritiya%20Dance%20Studio.`} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '16px 24px', borderRadius: 980, background: '#25D366', color: '#fff', textDecoration: 'none', fontSize: 15, fontWeight: 500, marginTop: 8, transition: 'opacity 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.opacity='0.88'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ── PORTAL CTA ── */}
      <section style={{ margin: '0 max(24px, calc((100vw - 1100px)/2)) clamp(60px, 8vw, 100px)', borderRadius: 24, overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', padding: 'clamp(40px, 6vw, 72px) clamp(32px, 6vw, 72px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
        <div>
          <h3 style={{ fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#f5f5f7', marginBottom: 12 }}>Already enrolled?</h3>
          <p style={{ fontSize: 16, color: 'rgba(245,245,247,0.55)', fontWeight: 300, maxWidth: 440 }}>Parents can view attendance, upcoming classes, and fee status. Instructors can manage the full studio from one place.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/parent" style={{ padding: '13px 26px', borderRadius: 980, fontSize: 14, fontWeight: 500, background: 'rgba(245,245,247,0.1)', color: '#f5f5f7', border: '1px solid rgba(245,245,247,0.2)', textDecoration: 'none', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(245,245,247,0.18)'} onMouseLeave={e => e.currentTarget.style.background='rgba(245,245,247,0.1)'}>
            Parent Portal
          </a>
          <a href="/login" style={{ padding: '13px 26px', borderRadius: 980, fontSize: 14, fontWeight: 500, background: '#f5f5f7', color: '#0a0a0a', textDecoration: 'none', transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity='0.88'} onMouseLeave={e => e.currentTarget.style.opacity='1'}>
            Studio Admin
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(245,245,247,0.08)', padding: '40px max(24px, calc((100vw - 1100px)/2))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🪷</span>
            <span style={{ fontSize: 13, color: 'rgba(245,245,247,0.4)' }}>Tritiya Dance Studio · Nagaram, Hyderabad</span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(245,245,247,0.25)' }}>© {new Date().getFullYear()} Tritiya Dance Studio · {s('about_badge_name', data)}</p>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href={`tel:${s('contact_phone',data)}`} style={{ fontSize: 12, color: 'rgba(245,245,247,0.35)', textDecoration: 'none' }}>{s('contact_phone',data)}</a>
            <a href="/parent" style={{ fontSize: 12, color: 'rgba(245,245,247,0.35)', textDecoration: 'none' }}>Parent Portal</a>
            <a href="/login" style={{ fontSize: 12, color: 'rgba(245,245,247,0.35)', textDecoration: 'none' }}>Admin</a>
          </div>
        </div>
      </footer>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { background: #0a0a0a !important; }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes fadeInDown { 0%{opacity:0.6;transform:translateY(-6px)} 100%{opacity:0;transform:translateY(6px)} }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .gallery-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .gallery-grid > div[style*="span 2"] { grid-column: span 2 !important; }
        }
        @media (max-width: 480px) {
          .gallery-grid { grid-template-columns: 1fr !important; }
          .gallery-grid > div { grid-column: span 1 !important; grid-row: span 1 !important; aspect-ratio: 4/3 !important; }
        }
        img { image-rendering: -webkit-optimize-contrast; }
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) { img { image-rendering: auto; } }
      `}</style>
    </div>
  );
}
