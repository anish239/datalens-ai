import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 transition-colors">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
