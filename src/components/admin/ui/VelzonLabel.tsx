'use client';

import React from 'react';

export interface VelzonLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function VelzonLabel({
  required,
  className = '',
  children,
  ...props
}: VelzonLabelProps) {
  return (
    <label
      className={`block text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans tracking-tight mb-1.5 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
    </label>
  );
}
