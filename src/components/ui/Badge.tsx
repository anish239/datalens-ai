import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  variant?: 'default' | 'secondary' | 'indigo' | 'outline' | 'success' | 'warning' | 'danger';
  children?: React.ReactNode;
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
    secondary: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60',
    outline: 'border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide whitespace-nowrap',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

