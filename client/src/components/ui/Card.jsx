import React from 'react';

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`bg-white rounded-[12px] border border-[#1a1a1a]/10 card-shadow p-6 ${
        hover ? 'transition-all duration-300 hover:-translate-y-1 hover:border-[#2563eb]/40 hover:shadow-md' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
