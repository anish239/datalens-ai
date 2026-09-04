import React, { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Check, X } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { AuthCard } from '../components/auth/AuthCard';
import { GoogleButton } from '../components/auth/GoogleButton';
import { useAuth } from '../hooks/useAuth';
import { mapAuthError } from '../services/auth';

export function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Password rules validation
  const hasMinLength = password.length >= 6;
  const hasNumberOrSymbol = /[0-9!@#$%^&*(),.?":{}|<>]/.test(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name or display name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!hasMinLength) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    try {
      setLoading(true);
      await signup(email, password, name);
      navigate('/dashboard', { replace: true });
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
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start exploring datasets with autonomous AI"
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
          <Input
            id="signup-name"
            label="Full Name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading || googleLoading}
            required
            leftIcon={<User className="w-4 h-4" />}
            autoComplete="name"
          />

          <Input
            id="signup-email"
            label="Email Address"
            type="email"
            placeholder="jane@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || googleLoading}
            required
            leftIcon={<Mail className="w-4 h-4" />}
            autoComplete="email"
          />

          <div>
            <Input
              id="signup-password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 6 characters"
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
              autoComplete="new-password"
            />

            {/* Password strength indicators */}
            {password && (
              <div className="mt-1.5 flex flex-wrap gap-3 text-[11px]">
                <span className={`inline-flex items-center gap-1 ${hasMinLength ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} 6+ characters
                </span>
                <span className={`inline-flex items-center gap-1 ${hasNumberOrSymbol ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {hasNumberOrSymbol ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Numbers or symbols
                </span>
              </div>
            )}
          </div>

          <Input
            id="signup-confirm-password"
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading || googleLoading}
            required
            leftIcon={<Lock className="w-4 h-4" />}
            autoComplete="new-password"
          />

          <Button
            id="btn-signup-submit"
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            loading={loading}
            loadingText="Creating account..."
            disabled={googleLoading}
          >
            Create Account
          </Button>
        </form>

        {/* Separator */}
        <div className="relative my-3">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-900 px-2 text-slate-400">
              Or sign up with
            </span>
          </div>
        </div>

        {/* Google Authentication */}
        <GoogleButton
          onClick={handleGoogleSignIn}
          loading={googleLoading}
          disabled={loading}
        />

        {/* Login Redirect */}
        <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            id="link-signin"
            className="font-semibold text-slate-900 dark:text-slate-100 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </AuthCard>
  );
}
