import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Sun, Moon, Laptop, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { isFirebaseConfigured } from '../../services/firebase';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return { section: 'Dashboard', page: 'Overview' };
      case '/datasets':
        return { section: 'Workspace', page: 'Datasets' };
      case '/analyses':
        return { section: 'Analytics', page: 'Analyses' };
      case '/reports':
        return { section: 'Exports', page: 'Reports' };
      case '/settings':
        return { section: 'Account', page: 'Settings' };
      default:
        return { section: 'Workspace', page: 'Overview' };
    }
  };

  const { section, page } = getPageTitle();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/90 bg-white/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 transition-colors">
      {/* Left side: Mobile hamburger & Clean Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          id="btn-mobile-sidebar-toggle"
          type="button"
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Open sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center text-xs sm:text-sm text-slate-400 dark:text-slate-500">
          <span className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            {section}
          </span>
          <span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium">
            {page}
          </span>
        </div>
      </div>

      {/* Right side utilities */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mr-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>RBAC Enforced</span>
        </div>

        {!isFirebaseConfigured && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            Firebase Config Pending
          </span>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          id="btn-header-theme-toggle"
          type="button"
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          aria-label="Toggle theme"
          title={`Theme: ${theme}`}
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4" />
          ) : theme === 'light' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Laptop className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
}
