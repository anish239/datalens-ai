import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  BarChart2,
  Database,
  Cpu,
  Brain,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getReportById, deleteReport, regenerateReport } from '../services/api';

export function ReportDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadReport() {
      if (!reportId) return;
      try {
        setLoading(true);
        const data = await getReportById(reportId);
        setReport(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [reportId]);

  const handleRegenerate = async () => {
    if (!reportId) return;
    try {
      setRegenerating(true);
      const updated = await regenerateReport(reportId);
      setReport(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate report');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!reportId || !confirm('Are you sure you want to delete this report?')) return;
    try {
      setDeleting(true);
      await deleteReport(reportId);
      navigate('/reports');
    } catch (err: any) {
      alert(err.message || 'Failed to delete report');
      setDeleting(false);
    }
  };

  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.datasetName || 'dataset'}_report_${report.reportId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    if (!report) return;
    let md = `# ${report.title}\n\n`;
    md += `**Dataset:** ${report.datasetName} | **Rows:** ${report.rowCount?.toLocaleString()} | **Columns:** ${report.columnCount} | **Quality Score:** ${report.dataQualityScore}/100\n`;
    md += `**Generated At:** ${new Date(report.generatedAt).toLocaleString()}\n\n`;
    md += `## Executive Summary\n${report.executiveSummary?.summary}\n\n`;
    md += `### Key Findings\n${report.executiveSummary?.keyFindings?.map((f: string) => `- ${f}`).join('\n')}\n\n`;
    md += `## Column Summary\n`;
    report.columnSummary?.forEach((col: any) => {
      md += `- **${col.name}** (${col.type}): Missing: ${col.missingCount} (${col.missingPercentage}%), Unique: ${col.uniqueCount}\n`;
    });
    md += `\n## AI Insights\n${report.aiInsights?.narrative}\n\n`;
    md += `## Methodology & Caveats\n${report.methodology?.map((m: string) => `- ${m}`).join('\n')}\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.datasetName || 'dataset'}_report_${report.reportId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading report document...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-12 text-center">
        <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Report Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'The requested analytical report could not be loaded.'}</p>
        </div>
        <Link to="/reports">
          <Button size="sm" variant="primary">
            Back to Reports
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link to="/reports">
            <Button size="sm" variant="ghost" icon={<ArrowLeft className="w-4 h-4" />}>
              Back
            </Button>
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {report.reportId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRegenerate}
            disabled={regenerating}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />}
          >
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExportMarkdown} icon={<FileText className="w-3.5 h-3.5" />}>
            Markdown
          </Button>
          <Button size="sm" variant="ghost" onClick={handleExportJson} icon={<Download className="w-3.5 h-3.5" />}>
            JSON
          </Button>
          <Button size="sm" variant="primary" onClick={handlePrintPdf} icon={<Download className="w-3.5 h-3.5" />}>
            Print / PDF
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Report Document Header */}
      <div className="space-y-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            DataLens AI Analytical Report
          </span>
          <span className="text-xs text-slate-400">
            Generated: {new Date(report.generatedAt).toLocaleString()}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {report.title}
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Dataset Name</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
              {report.datasetName}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Total Records</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
              {report.rowCount?.toLocaleString()} rows
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Attributes</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
              {report.columnCount} cols
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 block">Quality Score</span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {report.dataQualityScore} / 100
            </span>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" /> Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {report.executiveSummary?.summary}
          </p>
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Key Findings</h4>
            <ul className="space-y-1.5">
              {report.executiveSummary?.keyFindings?.map((finding: string, idx: number) => (
                <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Dataset Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Column Breakdown</span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 pt-1">
              <span>{report.overview?.numericColumnsCount} Numeric</span>
              <span className="text-slate-300">•</span>
              <span>{report.overview?.categoricalColumnsCount} Cat</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {report.overview?.datetimeColumnsCount || 0} datetime attributes detected.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Missing Data Rate</span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 pt-1">
              {report.overview?.missingPercentage}%
            </div>
            <p className="text-[11px] text-slate-500">
              {report.overview?.missingValuesTotal?.toLocaleString()} null cells total.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-1">
            <span className="text-[11px] font-medium text-slate-400">Duplicate Rows</span>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 pt-1">
              {report.overview?.duplicateRows?.toLocaleString()} rows
            </div>
            <p className="text-[11px] text-slate-500">Checked across all attribute keys.</p>
          </CardContent>
        </Card>
      </div>

      {/* Column Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600" /> Attribute Summary Table
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">Column</th>
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3">Non-Null</th>
                  <th className="pb-3 px-3">Missing</th>
                  <th className="pb-3 px-3">Unique</th>
                  <th className="pb-3 px-3">Mean / Stats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {report.columnSummary?.map((col: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200 font-mono">{col.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {col.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{col.nonNullCount?.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {col.missingCount} ({col.missingPercentage}%)
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">{col.uniqueCount?.toLocaleString()}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {col.mean !== undefined ? `mean: ${col.mean.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Correlations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" /> Bivariate Correlations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-500">{report.correlations?.summary}</p>
          {report.correlations?.topPositive?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Strongest Positive Correlations</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.correlations.topPositive.slice(0, 4).map((c: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {c.col1} ↔ {c.col2}
                    </span>
                    <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      r = {c.correlation}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ML Results (if available) */}
      {report.mlResults?.hasModels && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" /> Trained Machine Learning Models ({report.mlResults.modelsCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {report.mlResults.models.map((m: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      {m.algorithm} ({m.taskType})
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">Target: {m.targetColumn}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {m.primaryMetricName}: {m.primaryMetricValue.toFixed(3)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analyst Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-600" /> AI Analyst Narrative & Evidence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-mono">
            {report.aiInsights?.narrative}
          </div>
          <div className="text-[11px] text-slate-400 italic">
            Generated via {report.aiInsights?.generatedBy === 'gemini' ? 'Google Gemini AI (Grounded in Deterministic Engine)' : 'Deterministic Fallback Engine'}.
          </div>
        </CardContent>
      </Card>

      {/* Methodology & Caveats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Methodology & Analytical Caveats
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Methodology</h4>
            <ul className="space-y-1.5">
              {report.methodology?.map((m: string, i: number) => (
                <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <span className="h-1 w-1 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Caveats & Limitations</h4>
            <ul className="space-y-1.5">
              {report.caveats?.map((c: string, i: number) => (
                <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <span className="h-1 w-1 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
