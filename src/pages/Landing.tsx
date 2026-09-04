import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Database,
  LineChart,
  ShieldCheck,
  Cpu,
  FileCheck2,
  Lock,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { useAuth } from '../hooks/useAuth';

export function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-slate-200/50 dark:bg-slate-800/30 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-300 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Enterprise Security & Foundation Active
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.15]">
              Turn data into <span className="underline decoration-slate-400 dark:decoration-slate-600 decoration-2 underline-offset-8">decisions</span>.
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
              Analyze datasets, discover patterns, and turn complex data into actionable insights.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <Link to="/dashboard" id="hero-btn-dashboard">
                <Button size="lg" variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                  Go to Protected Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/signup" id="hero-btn-getstarted">
                  <Button size="lg" variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                    Get Started
                  </Button>
                </Link>
                <Link to="/login" id="hero-btn-signin">
                  <Button size="lg" variant="outline">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Architecture Trust Highlights */}
          <div className="pt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Firebase Auth
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Google OAuth & email credentials with server-side token validation.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Strict RBAC
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Firestore rules block unauthenticated reads and enforce document ownership.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Deterministic
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Calculations are computed by code, never fabricated by language models.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <FileCheck2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Isolated Storage
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Per-user file buckets for private CSV & Excel dataset protection.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="py-16 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Built for rigorous, verifiable data science
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              A dual-engine platform separating deterministic analytical computation from generative reasoning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Automated Exploratory Profiling
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Inspect cardinality, distributions, correlations, missing entries, and outliers automatically on CSV & XLSX ingestion.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100">
                <LineChart className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Statistical & ML Modeling
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Train regressions, classifications, clustering models, and evaluate them with MAE, RMSE, and F1 scores without data leakage.
              </p>
            </Card>

            <Card className="p-6 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-slate-100">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Autonomous AI Analyst
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Ask questions in plain English. Gemini reasons over verified code executions with evidence, methodology, and caveats.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-slate-900 dark:bg-slate-900 border border-slate-800 p-8 sm:p-12 text-center text-white space-y-6 shadow-xl">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to explore your data securely?
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto text-sm sm:text-base">
              Create an account with Firebase Authentication and start setting up your workspace today.
            </p>
            <div className="pt-2">
              <Link to="/signup">
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                  Create Free Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
