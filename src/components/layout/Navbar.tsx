import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, ArrowRight, Sun, Moon, Laptop } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../ui/Button';

export function Navbar() {
  const { isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          to="/"
          id="nav-brand-logo"
          className="flex items-center gap-2.5 text-slate-800 dark:text-slate-100 hover:opacity-95 transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight">DataLens AI</span>
          </div>
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            id="btn-nav-theme-toggle"
            type="button"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle theme"
            title={`Current theme: ${theme}`}
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4" />
            ) : theme === 'light' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Laptop className="w-4 h-4" />
            )}
          </button>

          {isAuthenticated ? (
            <Link to="/dashboard" id="nav-btn-dashboard">
              <Button size="sm" variant="primary" icon={<ArrowRight className="w-3.5 h-3.5" />}>
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" id="nav-btn-signin">
                <Button size="sm" variant="ghost">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup" id="nav-btn-getstarted">
                <Button size="sm" variant="primary">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
