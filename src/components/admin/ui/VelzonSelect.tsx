'use client';

import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface VelzonSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface VelzonSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: VelzonSelectOption[];
  error?: string;
  helperText?: string;
}

export const VelzonSelect = forwardRef<HTMLSelectElement, VelzonSelectProps>(
  ({ options, error, helperText, className = '', disabled, children, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        <div className="relative flex items-center">
          <select
            ref={ref}
            disabled={disabled}
            className={`w-full py-2 pl-3 pr-8 text-xs transition-colors rounded-lg bg-white dark:bg-[#141824] text-slate-800 dark:text-slate-100 border focus:outline-none focus:ring-1 appearance-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              error
                ? 'border-rose-400 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-500 text-rose-900 dark:text-rose-100'
                : 'border-[#e9ebec] dark:border-slate-700 focus:border-[#405189] focus:ring-[#405189]'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="bg-white dark:bg-[#141824] text-slate-800 dark:text-slate-100 py-1"
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
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

VelzonSelect.displayName = 'VelzonSelect';
