import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  LineChart,
  FileText,
  Settings,
  LogOut,
  Layers,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const { userProfile, currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Datasets', path: '/datasets', icon: Database },
    { label: 'Analyses', path: '/analyses', icon: LineChart },
    { label: 'Reports', path: '/reports', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const displayName = userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const email = currentUser?.email || userProfile?.email || '';
  const photoURL = userProfile?.photoURL || currentUser?.photoURL;
  const initial = displayName.charAt(0).toUpperCase();

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-colors">
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-100 dark:shadow-none">
              <Layers className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-800 dark:text-slate-100">
                DataLens AI
              </span>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation items */}
        <nav className="space-y-1 px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                id={`nav-link-${item.label.toLowerCase()}`}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Profile & Logout Bottom Bar */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between rounded-xl p-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/40">
          <div className="flex items-center gap-2.5 min-w-0">
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-200">
                {initial}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {displayName}
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                {email}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            id="btn-sidebar-logout"
            type="button"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
