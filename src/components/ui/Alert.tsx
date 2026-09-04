import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({ variant = 'info', title, children, onClose, className }: AlertProps) {
  const styles = {
    info: 'bg-blue-50/80 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-900/60 dark:text-blue-200',
    success: 'bg-emerald-50/80 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-200',
    warning: 'bg-amber-50/80 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-200',
    error: 'bg-rose-50/80 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900/60 dark:text-rose-200',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />,
  };

  return (
    <div className={cn('flex items-start gap-3 p-3.5 rounded-lg border text-sm', styles[variant], className)} role="alert">
      {icons[variant]}
      <div className="flex-1 space-y-0.5">
        {title && <h5 className="font-semibold text-xs uppercase tracking-wider">{title}</h5>}
        <div className="text-xs leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-700"
          aria-label="Dismiss alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
