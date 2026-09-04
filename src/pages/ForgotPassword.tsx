import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { AuthCard } from '../components/auth/AuthCard';
import { useAuth } from '../hooks/useAuth';
import { mapAuthError } from '../services/auth';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { resetPassword } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);
      await resetPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      // For security, do not expose whether the email exists unless invalid syntax
      if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        // Safe generic message to prevent account enumeration
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Reset password"
      subtitle="Enter your email to receive recovery instructions"
    >
      <div className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {submitted ? (
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Check your inbox
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                If an account exists for <span className="font-semibold text-slate-700 dark:text-slate-200">{email}</span>, a secure password reset link has been dispatched.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/login" id="link-return-login">
                <Button variant="outline" size="md" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              id="reset-email"
              label="Email Address"
              type="email"
              placeholder="analyst@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
            />

            <Button
              id="btn-reset-submit"
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              loading={loading}
              loadingText="Sending reset link..."
            >
              Send Reset Link
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                id="link-back-to-login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthCard>
  );
}
