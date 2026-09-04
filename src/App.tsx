import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './hooks/useTheme';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { PublicOnlyRoute } from './routes/PublicOnlyRoute';

// Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Datasets } from './pages/Datasets';
import { Analyses } from './pages/Analyses';
import { Reports } from './pages/Reports';
import { ReportDetail } from './pages/ReportDetail';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<Landing />} />

            {/* Public Auth Routes (Redirects to /dashboard if already logged in) */}
            <Route element={<PublicOnlyRoute />}>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>
            </Route>

            {/* Protected Workspace Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/datasets" element={<Datasets />} />
                <Route path="/analyses" element={<Analyses />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/:reportId" element={<ReportDetail />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Fallback 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}
