import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size] || 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-t-apple-lg sm:rounded-apple-lg shadow-apple-lg w-full ${sizeClass} max-h-[92vh] sm:max-h-[88vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-apple-gray-2">
          <h2 className="text-base font-semibold text-apple-text">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-apple-gray text-apple-gray-5 hover:text-apple-text transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
