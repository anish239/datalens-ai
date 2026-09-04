import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Sun,
  Moon,
  Laptop,
  LogOut,
  Shield,
  Check,
  Save,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import { useTheme, Theme } from '../hooks/useTheme';
import { updateUserProfile } from '../services/firestore';

export function Settings() {
  const { currentUser, userProfile, logout, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || currentUser?.displayName || ''
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    setSaveError(null);
    setSaveSuccess(false);

    try {
      setSaving(true);
      await updateUserProfile(currentUser.uid, {
        displayName: displayName.trim(),
      });
      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const providerName =
    userProfile?.provider === 'google.com'
      ? 'Google Sign-In'
      : userProfile?.provider === 'github.com'
      ? 'GitHub'
      : 'Email & Password';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your personal profile, appearance preferences, and account security.
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Details</CardTitle>
          <CardDescription>
            Your identity information associated with your Firestore user record.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {saveSuccess && (
            <Alert variant="success" onClose={() => setSaveSuccess(false)}>
              Profile updated successfully.
            </Alert>
          )}

          {saveError && (
            <Alert variant="error" onClose={() => setSaveError(null)}>
              {saveError}
            </Alert>
          )}

          <div className="flex items-center gap-4">
            {userProfile?.photoURL || currentUser?.photoURL ? (
              <img
                src={userProfile?.photoURL || currentUser?.photoURL || ''}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-xl font-bold text-slate-700 dark:text-slate-200">
                {(displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                  {displayName || 'Data Analyst'}
                </h3>
                <Badge variant="secondary">{providerName}</Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono">{currentUser?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <Input
              id="settings-display-name"
              label="Display Name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={saving}
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              id="settings-email"
              label="Email Address"
              type="email"
              value={currentUser?.email || ''}
              disabled={true}
              helperText="Email cannot be changed directly in this view."
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="flex justify-end pt-2">
              <Button
                id="btn-save-profile"
                type="submit"
                variant="primary"
                size="sm"
                loading={saving}
                loadingText="Saving..."
                icon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>
            Customize how DataLens AI looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              id="theme-btn-light"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'border-slate-900 bg-slate-100 text-slate-900 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-100 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light</span>
              {theme === 'light' && <Check className="w-4 h-4 ml-auto" />}
            </button>

            <button
              type="button"
              id="theme-btn-dark"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'border-slate-900 bg-slate-100 text-slate-900 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-100 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark</span>
              {theme === 'dark' && <Check className="w-4 h-4 ml-auto" />}
            </button>

            <button
              type="button"
              id="theme-btn-system"
              onClick={() => setTheme('system')}
              className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                theme === 'system'
                  ? 'border-slate-900 bg-slate-100 text-slate-900 dark:border-slate-100 dark:bg-slate-800 dark:text-slate-100 shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>System</span>
              {theme === 'system' && <Check className="w-4 h-4 ml-auto" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Account & Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account & Security</CardTitle>
          <CardDescription>
            Review active session tokens and sign out of this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Authenticated UID:
              </span>
              <code className="font-mono text-slate-500 dark:text-slate-400">
                {currentUser?.uid}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Security Sandbox:
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Active (RBAC Enforced)
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Sign Out
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                End your active Firebase session on this device.
              </p>
            </div>
            <Button
              id="btn-settings-logout"
              type="button"
              variant="danger"
              size="sm"
              onClick={handleLogout}
              icon={<LogOut className="w-4 h-4" />}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
