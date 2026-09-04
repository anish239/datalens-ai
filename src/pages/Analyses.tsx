import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Layers,
  Cpu,
  Sparkles,
  ArrowRight,
  Database,
  FileSpreadsheet,
  Activity,
  BarChart3,
  Clock,
  FileText,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserDatasets } from '../services/firestore';
import { getDatasetProfile, generateDatasetReport } from '../services/api';
import { DatasetProfile } from '../types/dataset';
import { DatasetAnalyticsExplorer } from '../components/datasets/DatasetAnalyticsExplorer';

export function Analyses() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    async function load() {
      if (currentUser?.uid) {
        setLoading(true);
        const list = await getUserDatasets(currentUser.uid);
        setDatasets(list);
        if (list.length > 0) {
          const savedId = localStorage.getItem(`datalens_active_dataset_${currentUser.uid}`);
          const matching = list.find((d: any) => (d.datasetId || d.id) === savedId);
          if (matching) {
            setSelectedDatasetId(matching.datasetId || matching.id);
          } else {
            const firstId = list[0].datasetId || list[0].id;
            setSelectedDatasetId(firstId);
            localStorage.setItem(`datalens_active_dataset_${currentUser.uid}`, firstId);
          }
        } else {
          setSelectedDatasetId(null);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    }
    load();
  }, [currentUser?.uid]);

  const handleSelectDataset = (id: string) => {
    setSelectedDatasetId(id);
    if (currentUser?.uid) {
      localStorage.setItem(`datalens_active_dataset_${currentUser.uid}`, id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('datalens:metrics-updated', { detail: { ownerId: currentUser.uid } })
        );
      }
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedDatasetId) return;
    try {
      setGeneratingReport(true);
      const report = await generateDatasetReport(selectedDatasetId);
      navigate(`/reports/${report.reportId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  useEffect(() => {
    async function fetchProf() {
      if (selectedDatasetId) {
        try {
          setLoadingProfile(true);
          const p = await getDatasetProfile(selectedDatasetId);
          setProfile(p);
        } catch (e) {
          console.error('Failed to load profile for analysis:', e);
        } finally {
          setLoadingProfile(false);
        }
      } else {
        setProfile(null);
      }
    }
    fetchProf();
  }, [selectedDatasetId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Analyses & Insights
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Deterministic exploratory data analysis, statistical computations, and data science tooling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="indigo" className="py-1 px-3">
            <Clock className="w-3.5 h-3.5 mr-1" />
            Analytics Active
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading datasets...</div>
      ) : datasets.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                No datasets uploaded yet.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Upload a CSV or Excel dataset to run deterministic statistical analytics, outlier detection, correlations, and distributions.
              </p>
            </div>
            <div className="pt-2">
              <Link to="/datasets">
                <Button size="sm" variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                  Go to Datasets & Upload
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Dataset Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Active Dataset:
              </span>
              <select
                value={selectedDatasetId || ''}
                onChange={(e) => handleSelectDataset(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fileName} ({d.rowCount?.toLocaleString()} rows)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={handleGenerateReport}
                disabled={generatingReport || !selectedDatasetId}
                icon={<Sparkles className={`w-3.5 h-3.5 ${generatingReport ? 'animate-spin' : ''}`} />}
              >
                {generatingReport ? 'Generating Report...' : 'Generate Report'}
              </Button>
              <Link to="/datasets">
                <Button size="sm" variant="ghost">
                  Manage Datasets
                </Button>
              </Link>
            </div>
          </div>

          {loadingProfile ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading dataset profile and analytical engine...</div>
          ) : profile ? (
            <DatasetAnalyticsExplorer profile={profile} />
          ) : null}
        </div>
      )}
    </div>
  );
}
