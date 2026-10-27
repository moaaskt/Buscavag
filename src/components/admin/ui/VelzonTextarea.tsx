'use client';

import React, { forwardRef } from 'react';

export interface VelzonTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  helperText?: string;
}

export const VelzonTextarea = forwardRef<HTMLTextAreaElement, VelzonTextareaProps>(
  ({ error, helperText, className = '', disabled, rows = 3, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <textarea
          ref={ref}
          rows={rows}
          disabled={disabled}
          className={`w-full py-2 px-3 text-xs transition-colors rounded-lg bg-white dark:bg-[#141824] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border focus:outline-none focus:ring-1 resize-y disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? 'border-rose-400 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-100'
              : 'border-[#e9ebec] dark:border-slate-700 focus:border-[#405189] focus:ring-[#405189]'
          } ${className}`}
          {...props}
        />

        {error && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

VelzonTextarea.displayName = 'VelzonTextarea';
