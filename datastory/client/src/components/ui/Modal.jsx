import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1a1a]/40 backdrop-blur-sm animate-fadeIn">
      <div
        className={`bg-[#faf9f7] border border-[#1a1a1a]/15 rounded-[12px] shadow-2xl w-full ${maxWidth} overflow-hidden transform transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]/10 bg-white">
          <h3 className="font-display font-bold text-lg text-[#1a1a1a]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#6b6b6b] hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, variant = 'neutral', className = '' }) {
  const variantStyles = {
    neutral: 'bg-[#1a1a1a]/5 text-[#6b6b6b] border-[#1a1a1a]/10',
    primary: 'bg-[#2563eb]/10 text-[#2563eb] border-[#2563eb]/20',
    success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
