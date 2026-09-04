import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  leftIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      children,
      id,
      required,
      disabled,
      leftIcon,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

    return (
      <div className={cn('w-full space-y-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase"
          >
            {label}
            {required && <span className="text-rose-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative rounded-lg">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 z-10">
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            className={cn(
              'w-full appearance-none rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-xs transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:ring-indigo-500/30 dark:focus:border-indigo-400',
              'disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed',
              'pr-9 cursor-pointer',
              leftIcon ? 'pl-9' : 'pl-3',
              error
                ? 'border-rose-500 focus:ring-rose-500 dark:border-rose-500'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
              className
            )}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 dark:text-slate-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-rose-600 dark:text-rose-400 font-medium">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${selectId}-helper`} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
