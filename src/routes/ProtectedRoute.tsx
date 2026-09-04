import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Layers } from 'lucide-react';

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-lg animate-pulse">
            <Layers className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Authenticating session...
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verifying security tokens and Firestore permissions
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve current attempted location so user is returned after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
