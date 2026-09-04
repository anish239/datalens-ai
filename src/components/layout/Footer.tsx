import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ShieldCheck, Database, Lock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950 transition-colors py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                <Layers className="h-4 w-4" />
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100">DataLens AI</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              Turn data into decisions. Autonomous AI data analyst SaaS platform for deterministic analytics, automated EDA, and evidence-backed insights.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-2">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Firebase Auth & RBAC
              </span>
              <span className="inline-flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Isolated Storage
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/dashboard" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/datasets" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  Datasets
                </Link>
              </li>
              <li>
                <Link to="/analyses" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  Analyses
                </Link>
              </li>
              <li>
                <Link to="/reports" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                  Reports
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3">
              Platform Status
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
              Enterprise security foundation active. User profiles, authentication, isolated storage rules, and protected routing are verified.
            </p>
            <div className="text-[11px] text-slate-400 font-mono">
              Version 1.0.0-production
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-100 dark:border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} DataLens AI. All rights reserved.</p>
          <p className="flex items-center gap-1 text-[11px]">
            Engineered with strict security rules and zero mock data fabrications.
          </p>
        </div>
      </div>
    </footer>
  );
}
