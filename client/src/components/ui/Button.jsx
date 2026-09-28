import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  disabled = false,
  ...props
}) {
  const baseStyle =
    'inline-flex items-center justify-center font-medium rounded-[8px] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#b5470b]/50 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5'
  };

  const variantStyles = {
    primary: 'bg-[#b5470b] text-white hover:bg-[#963a09] active:bg-[#782e07] shadow-sm',
    secondary: 'bg-[var(--ink)] text-white hover:bg-[#2e2c28] active:bg-[#000000]',
    outline: 'border border-[var(--ink)]/15 text-[var(--ink)] hover:bg-[var(--ink)]/5 bg-transparent',
    ghost: 'text-[var(--ink)] hover:bg-[var(--ink)]/5 bg-transparent',
    accentGhost: 'text-[#b5470b] hover:bg-[#b5470b]/10 bg-transparent'
  };

  return (
    <button
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  );
}
