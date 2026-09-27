import React from 'react';

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
