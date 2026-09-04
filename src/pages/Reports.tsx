import React, { useEffect, useState } from 'react';
import { FileText, Plus, ArrowRight, Trash2, RefreshCw, Eye, Sparkles, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserReports, deleteReport, generateDatasetReport, regenerateReport } from '../services/api';
import { getUserDatasets } from '../services/firestore';

export function Reports() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDatasetForGen, setSelectedDatasetForGen] = useState<string>('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!currentUser?.uid) return;
      try {
        setLoading(true);
        const [repList, dsList] = await Promise.all([
          getUserReports().catch(() => []),
          getUserDatasets(currentUser.uid).catch(() => []),
        ]);
        setReports(repList);
        setDatasets(dsList);
        if (dsList.length > 0) {
          const firstId = dsList[0].datasetId || dsList[0].id;
          setSelectedDatasetForGen(firstId);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load reports');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser?.uid]);

  const handleGenerate = async () => {
    if (!selectedDatasetForGen) {
      alert('Please select a dataset to generate a report.');
      return;
    }
    try {
      setGenerating(true);
      const newReport = await generateDatasetReport(selectedDatasetForGen);
      setShowGenModal(false);
      navigate(`/reports/${newReport.reportId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteReport(reportId);
      setReports((prev) => prev.filter((r) => r.reportId !== reportId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete report');
    }
  };

  const handleRegenerate = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setGenerating(true);
      const updated = await regenerateReport(reportId);
      setReports((prev) => prev.map((r) => (r.reportId === reportId ? updated : r)));
      alert('Report successfully regenerated from current dataset state.');
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Reports & Executive Summaries
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Generate and export evidence-backed analytical audits, statistical summaries, and AI insights.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={() => setShowGenModal(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          Generate New Report
        </Button>
      </div>

      {/* Generate Report Modal / Drawer */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Generate Analytical Report</h3>
              <p className="text-xs text-slate-500">
                Select an uploaded dataset to compute deterministic statistics, correlations, outliers, and AI insights.
              </p>
            </div>

            {datasets.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                No datasets available. Please upload a CSV or Excel dataset first.
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Select Dataset
                </label>
                <select
                  value={selectedDatasetForGen}
                  onChange={(e) => setSelectedDatasetForGen(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fileName} ({d.rowCount?.toLocaleString()} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowGenModal(false)}>
                Cancel
              </Button>
              {datasets.length > 0 && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleGenerate}
                  disabled={generating}
                  icon={<Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />}
                >
                  {generating ? 'Generating Report...' : 'Generate Report'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reports List */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400">Loading reports...</div>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                No generated reports yet.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Export comprehensive analytical summaries with supporting methodology, data caveats, charts, and mathematical evidence.
              </p>
            </div>
            <div className="pt-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (datasets.length > 0) setShowGenModal(true);
                  else navigate('/datasets');
                }}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {datasets.length > 0 ? 'Generate Report from Dataset' : 'Upload Dataset to Begin'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => (
            <Card
              key={report.reportId}
              className="hover:border-indigo-500/50 transition-all cursor-pointer group"
              onClick={() => navigate(`/reports/${report.reportId}`)}
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                      {report.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleRegenerate(report.reportId, e)}
                      title="Regenerate Report"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(report.reportId, e)}
                      title="Delete Report"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Dataset</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {report.datasetName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rows</span>
                    <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                      {report.rowCount?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Quality Score</span>
                    <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {report.dataQualityScore}/100
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
