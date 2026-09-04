import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { ConfigWarning } from './ConfigWarning';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        <Link
          to="/"
          id="link-brand-home"
          className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-800 dark:text-slate-100 hover:opacity-90 transition-opacity"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">DataLens AI</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          {title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{subtitle}</p>
      </div>

      <ConfigWarning />

      {/* Main Container Card */}
      <Card className="border border-slate-200/80 shadow-md dark:border-slate-800 dark:bg-slate-900/90 backdrop-blur-sm">
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </div>
  );
}
