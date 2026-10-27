'use client';

import React, { forwardRef } from 'react';

export interface VelzonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const VelzonInput = forwardRef<HTMLInputElement, VelzonInputProps>(
  ({ leftIcon, rightElement, error, helperText, className = '', disabled, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            disabled={disabled}
            className={`w-full py-2 text-xs transition-colors rounded-lg bg-white dark:bg-[#141824] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : 'pl-3'
            } ${rightElement ? 'pr-9' : 'pr-3'} ${
              error
                ? 'border-rose-400 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-100'
                : 'border-[#e9ebec] dark:border-slate-700 focus:border-[#405189] focus:ring-[#405189]'
            } ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
              {rightElement}
            </div>
          )}
        </div>

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

VelzonInput.displayName = 'VelzonInput';
