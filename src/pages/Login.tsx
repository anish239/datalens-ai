import React, { useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { AuthCard } from '../components/auth/AuthCard';
import { GoogleButton } from '../components/auth/GoogleButton';
import { useAuth } from '../hooks/useAuth';
import { mapAuthError } from '../services/auth';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      setGoogleLoading(true);
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to access your DataLens workspace"
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            id="login-email"
            label="Email Address"
            type="email"
            placeholder="analyst@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || googleLoading}
            required
            leftIcon={<Mail className="w-4 h-4" />}
            autoComplete="email"
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-wide uppercase"
              >
                Password <span className="text-rose-500">*</span>
              </label>
              <Link
                to="/forgot-password"
                id="link-forgot-password"
                className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || googleLoading}
              required
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="current-password"
            />
          </div>

          <Button
            id="btn-login-submit"
            type="submit"
            variant="primary"
            size="md"
            className="w-full"
            loading={loading}
            loadingText="Signing in..."
            disabled={googleLoading}
          >
            Sign In
          </Button>
        </form>

        {/* Separator */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">
              Or continue with
            </span>
          </div>
        </div>

        {/* Google Authentication */}
        <GoogleButton
          onClick={handleGoogleSignIn}
          loading={googleLoading}
          disabled={loading}
        />

        {/* Signup Redirect */}
        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link
            to="/signup"
            id="link-create-account"
            className="font-semibold text-slate-900 dark:text-slate-100 hover:underline"
          >
            Create account
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
