import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa_dismissed') === '1');

  useEffect(() => {
    function handler(e) {
      e.preventDefault();
      setPrompt(e);
      if (!dismissed) setShow(true);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setShow(false);
  }

  function handleDismiss() {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('pwa_dismissed', '1');
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-apple-dark rounded-2xl shadow-apple-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-apple-blue rounded-xl flex items-center justify-center text-xl shrink-0">🪷</div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-tight">Add to Home Screen</p>
          <p className="text-white/50 text-xs mt-0.5">Install for quick access from your phone</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handleInstall} className="bg-apple-blue text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1">
            <Download size={11}/> Add
          </button>
          <button onClick={handleDismiss} className="p-1.5 text-white/40 hover:text-white">
            <X size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}
