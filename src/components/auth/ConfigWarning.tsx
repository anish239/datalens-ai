import React from 'react';
import { AlertTriangle, Key } from 'lucide-react';
import { isFirebaseConfigured } from '../../services/firebase';

export function ConfigWarning() {
  if (isFirebaseConfigured) return null;

  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-semibold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
            Firebase Configuration Pending
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-300/90 leading-relaxed">
            Please add your Firebase Web app credentials to <code className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-mono text-[11px]">.env</code> (<code className="font-mono">VITE_FIREBASE_API_KEY</code>, <code className="font-mono">VITE_FIREBASE_AUTH_DOMAIN</code>, <code className="font-mono">VITE_FIREBASE_PROJECT_ID</code>).
          </p>
        </div>
      </div>
    </div>
  );
}
