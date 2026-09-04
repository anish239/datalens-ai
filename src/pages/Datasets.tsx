import React, { useState, useEffect } from 'react';
import {
  Database,
  FileSpreadsheet,
  ShieldCheck,
  Info,
  Clock,
  CheckCircle2,
  Layers,
  UploadCloud,
  Plus,
  Trash2,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { getUserDatasets } from '../services/firestore';
import { getDatasetProfile, deleteDataset } from '../services/api';
import { DatasetProfile } from '../types/dataset';
import { DatasetUploadModal } from '../components/datasets/DatasetUploadModal';
import { DatasetProfileViewer } from '../components/datasets/DatasetProfileViewer';
import { formatBytes, formatDate } from '../lib/utils';

export function Datasets() {
  const { currentUser } = useAuth();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<DatasetProfile | null>(null);
  const [loadingProfileId, setLoadingProfileId] = useState<string | null>(null);

  const fetchDatasets = async () => {
    if (currentUser?.uid) {
      setLoading(true);
      const data = await getUserDatasets(currentUser.uid);
      setDatasets(data);
      setLoading(false);
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [currentUser?.uid]);

  const handleUploadSuccess = (profile: DatasetProfile) => {
    setSelectedProfile(profile);
    setIsUploadModalOpen(false);
    if (currentUser?.uid && profile.datasetId) {
      localStorage.setItem(`datalens_active_dataset_${currentUser.uid}`, profile.datasetId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('datalens:metrics-updated', { detail: { ownerId: currentUser.uid } })
        );
      }
    }
    fetchDatasets();
  };

  const handleViewProfile = async (datasetId: string) => {
    try {
      setLoadingProfileId(datasetId);
      const profile = await getDatasetProfile(datasetId);
      setSelectedProfile(profile);
      if (currentUser?.uid) {
        localStorage.setItem(`datalens_active_dataset_${currentUser.uid}`, datasetId);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('datalens:metrics-updated', { detail: { ownerId: currentUser.uid } })
          );
        }
      }
    } catch (err) {
      console.error('Failed to load dataset profile:', err);
    } finally {
      setLoadingProfileId(null);
    }
  };

  const handleDeleteDataset = async (datasetId: string) => {
    if (!window.confirm('Are you sure you want to delete this dataset metadata and temporary profile?')) {
      return;
    }
    try {
      await deleteDataset(datasetId);
      setSelectedProfile(null);
      if (currentUser?.uid) {
        const activeId = localStorage.getItem(`datalens_active_dataset_${currentUser.uid}`);
        if (activeId === datasetId) {
          localStorage.removeItem(`datalens_active_dataset_${currentUser.uid}`);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('datalens:metrics-updated', { detail: { ownerId: currentUser.uid } })
          );
        }
      }
      fetchDatasets();
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    }
  };

  if (selectedProfile) {
    return (
      <DatasetProfileViewer
        profile={selectedProfile}
        onBack={() => setSelectedProfile(null)}
        onDelete={handleDeleteDataset}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Datasets
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Secure dataset ingestion architecture and deterministic Pandas / SciPy analytics engine.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="indigo" className="py-1 px-3">
            <Clock className="w-3.5 h-3.5 mr-1" />
            System Active
          </Badge>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Upload Dataset
          </Button>
        </div>
      </div>

      {/* Dataset Ingestion Architecture Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Supported Formats
            </h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Engineered for tabular data files including CSV (<code className="font-mono text-[11px]">.csv</code>) and Excel spreadsheets (<code className="font-mono text-[11px]">.xlsx</code>) up to 50 MB per dataset.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>FastAPI & Pandas pipeline active</span>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Storage Security Model
            </h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Strict user-level directory partitioning with sanitized file paths preventing directory traversal or cross-user data leakage.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Firebase ID token verification</span>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Deterministic Profiling
            </h4>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Automated schema inference, missing value metrics, duplicate detection, and heuristic target identification.
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Quality score calculated</span>
          </div>
        </Card>
      </div>

      {/* Dataset Records List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Workspace Datasets</CardTitle>
            <CardDescription>
              Active metadata records and profiles stored securely in Firestore for your account.
            </CardDescription>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            icon={<UploadCloud className="w-4 h-4" />}
          >
            Upload New
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading dataset records from Firestore...
            </div>
          ) : datasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Database className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  No datasets currently ingested
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upload your first CSV or Excel spreadsheet to generate an automated Pandas data profile and quality score.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                icon={<UploadCloud className="w-4 h-4" />}
              >
                Upload Dataset Now
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[160px]" title={dataset.name}>
                            {dataset.name}
                          </h4>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {dataset.fileType?.toUpperCase()} • {formatBytes(dataset.fileSizeBytes || dataset.fileSize || 0)}
                          </span>
                        </div>
                      </div>
                      <Badge variant="indigo">
                        {dataset.dataQualityScore ? `${dataset.dataQualityScore}/100 Quality` : 'Indexed'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Rows</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {dataset.rowCount?.toLocaleString() || '—'}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Columns</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                          {dataset.columnCount || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {formatDate(dataset.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewProfile(dataset.id)}
                        disabled={loadingProfileId === dataset.id}
                        icon={<Eye className="w-3.5 h-3.5" />}
                      >
                        {loadingProfileId === dataset.id ? 'Loading...' : 'Profile'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDataset(dataset.id)}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dataset Upload Modal */}
      <DatasetUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
