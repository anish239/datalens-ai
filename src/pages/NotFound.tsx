import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowLeft, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 text-center">
      <div className="space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md">
            <Layers className="h-8 w-8" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            404
          </h1>
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            Page not found
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The page you requested could not be located. It may have been moved or does not exist.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/">
            <Button variant="outline" size="sm" icon={<Home className="w-4 h-4" />}>
              Home
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="primary" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
