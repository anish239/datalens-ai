import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  LineChart,
  FileText,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Plus,
  Lock,
  Layers,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getTimeGreeting } from '../lib/utils';
import { getUserMetrics, getUserDatasets, UserWorkspaceMetrics } from '../services/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

export function Dashboard() {
  const { userProfile, currentUser, loading: authLoading } = useAuth();
  const [metrics, setMetrics] = useState<UserWorkspaceMetrics>({
    datasetCount: 0,
    analysisCount: 0,
    reportCount: 0,
    insightCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Analyst';

  const loadMetrics = async () => {
    if (authLoading) return;
    if (!currentUser?.uid) {
      setLoading(false);
      setMetrics({ datasetCount: 0, analysisCount: 0, reportCount: 0, insightCount: 0 });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userDatasets = await getUserDatasets(currentUser.uid);
      let activeDatasetId: string | null = null;
      if (userDatasets.length > 0) {
        const savedId =
          typeof localStorage !== 'undefined'
            ? localStorage.getItem(`datalens_active_dataset_${currentUser.uid}`)
            : null;
        const matching = userDatasets.find((d: any) => (d.datasetId || d.id) === savedId);
        if (matching) {
          activeDatasetId = matching.datasetId || matching.id;
        } else {
          activeDatasetId = userDatasets[0].datasetId || userDatasets[0].id;
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`datalens_active_dataset_${currentUser.uid}`, activeDatasetId!);
          }
        }
      } else {
        activeDatasetId = null;
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(`datalens_active_dataset_${currentUser.uid}`);
        }
      }

      const data = await getUserMetrics(currentUser.uid, activeDatasetId);
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workspace metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail?.ownerId || customEvent.detail.ownerId === currentUser?.uid) {
        loadMetrics();
      }
    };

    const handleFocus = () => {
      loadMetrics();
    };

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key?.includes('datalens_analyses') ||
        e.key?.includes('datalens_datasets') ||
        e.key?.includes('datalens_active_dataset')
      ) {
        loadMetrics();
      }
    };

    window.addEventListener('datalens:metrics-updated', handleUpdate);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('datalens:metrics-updated', handleUpdate);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser?.uid, authLoading]);

  return (
    <div className="space-y-8">
      {/* Dynamic Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            {getTimeGreeting(displayName)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Here's an overview of your autonomous analytics workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/datasets" id="dashboard-btn-upload">
            <Button variant="primary" size="sm" icon={<Layers className="w-4 h-4" />}>
              View Datasets
            </Button>
          </Link>
        </div>
      </div>

      {/* Error state notification */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold">Unable to sync workspace metrics:</span>
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="self-start sm:self-auto border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
            onClick={() => loadMetrics()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Real Firestore-backed metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Datasets */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Datasets
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Database className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 my-1" aria-label="Loading datasets count">
              <Skeleton className="h-9 w-16" />
              <span className="text-xs text-slate-400 font-medium">Loading...</span>
            </div>
          ) : error && !metrics ? (
            <div className="text-sm font-medium text-red-500 my-2">Error loading</div>
          ) : (
            <div className="text-3xl font-light tracking-tight text-slate-800 dark:text-slate-100">
              {metrics?.datasetCount ?? 0}
            </div>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Active structured files
          </p>
        </Card>

        {/* Analyses */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Analyses
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <LineChart className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 my-1" aria-label="Loading analyses count">
              <Skeleton className="h-9 w-16" />
              <span className="text-xs text-slate-400 font-medium">Loading...</span>
            </div>
          ) : error && !metrics ? (
            <div className="text-sm font-medium text-red-500 my-2">Error loading</div>
          ) : (
            <div className="text-3xl font-light tracking-tight text-slate-800 dark:text-slate-100" id="dashboard-metric-analyses">
              {metrics?.analysisCount ?? 0}
            </div>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Statistical & ML jobs
          </p>
        </Card>

        {/* Insights */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Insights
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 my-1" aria-label="Loading insights count">
              <Skeleton className="h-9 w-16" />
              <span className="text-xs text-slate-400 font-medium">Loading...</span>
            </div>
          ) : error && !metrics ? (
            <div className="text-sm font-medium text-red-500 my-2">Error loading</div>
          ) : (
            <div className="text-3xl font-light tracking-tight text-slate-800 dark:text-slate-100" id="dashboard-metric-insights">
              {metrics?.insightCount ?? 0}
            </div>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Verified analytical insights
          </p>
        </Card>

        {/* Reports */}
        <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-all p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Reports
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 my-1" aria-label="Loading reports count">
              <Skeleton className="h-9 w-16" />
              <span className="text-xs text-slate-400 font-medium">Loading...</span>
            </div>
          ) : error && !metrics ? (
            <div className="text-sm font-medium text-red-500 my-2">Error loading</div>
          ) : (
            <div className="text-3xl font-light tracking-tight text-slate-800 dark:text-slate-100">
              {metrics?.reportCount ?? 0}
            </div>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Generated executive reports
          </p>
        </Card>
      </div>

      {/* Main Workspace Status & Getting Started */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dataset Quickstart / Empty State */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workspace Ingestion</CardTitle>
            <CardDescription>
              Upload datasets to begin automated exploratory data profiling and ML modeling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-3 py-4" aria-label="Loading workspace ingestion status">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-9 w-36" />
              </div>
            ) : (metrics?.datasetCount ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
                <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Database className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    No datasets currently indexed
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dataset ingestion and automated profiling are ready.
                  </p>
                </div>
                <Link to="/datasets">
                  <Button size="sm" variant="primary" icon={<Layers className="w-4 h-4" />}>
                    Explore Datasets Architecture
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  You have {metrics?.datasetCount ?? 0} active dataset(s) loaded into your isolated workspace.
                </p>
                <div className="flex items-center gap-2">
                  <Link to="/datasets">
                    <Button size="sm" variant="outline">
                      Manage Datasets
                    </Button>
                  </Link>
                  <Link to="/analyses">
                    <Button size="sm" variant="primary" icon={<Sparkles className="w-3.5 h-3.5" />}>
                      Ask AI Analyst
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Col: Security & Architecture Verification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Autonomous Engine Security
            </CardTitle>
            <CardDescription>
              Deterministic tool grounding & token validation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    Authenticated Session:
                  </span>{' '}
                  <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px] block truncate">
                    UID: {currentUser?.uid}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    Deterministic Math Layer:
                  </span>{' '}
                  <span className="text-slate-400 dark:text-slate-500 block">
                    Zero LLM numerical hallucinations; calculations run via Pandas/SciPy engine.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                    Security Boundary:
                  </span>{' '}
                  <span className="text-slate-400 dark:text-slate-500 block">
                    No arbitrary code execution; model restricted to strictly validated tool declarations.
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Analyst & Tool-Calling Pipeline Active</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
