import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  BarChart2,
  ArrowLeft,
  Trash2,
  Info,
} from 'lucide-react';
import { DatasetProfile, ColumnProfile } from '../../types/dataset';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatBytes, formatDate } from '../../lib/utils';
import { DatasetAnalyticsExplorer } from './DatasetAnalyticsExplorer';

interface DatasetProfileViewerProps {
  profile: DatasetProfile;
  onBack: () => void;
  onDelete?: (datasetId: string) => void;
}

export function DatasetProfileViewer({
  profile,
  onBack,
  onDelete,
}: DatasetProfileViewerProps) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'schema' | 'preview' | 'quality'>('analytics');

  const toggleColumnExpand = (colName: string) => {
    setExpandedColumn((prev) => (prev === colName ? null : colName));
  };

  const getQualityBadgeColor = (score: number) => {
    if (score >= 85) return 'success';
    if (score >= 65) return 'warning';
    return 'danger';
  };

  const getLogicalTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric':
        return <Hash className="w-3.5 h-3.5 text-blue-500" />;
      case 'categorical':
        return <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'text':
        return <Type className="w-3.5 h-3.5 text-purple-500" />;
      case 'boolean':
        return <ToggleLeft className="w-3.5 h-3.5 text-amber-500" />;
      case 'datetime':
        return <Calendar className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Datasets
          </Button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">{profile.fileName}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {onDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => onDelete(profile.datasetId)}
              icon={<Trash2 className="w-4 h-4" />}
            >
              Delete Dataset
            </Button>
          )}
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Total Rows
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {profile.rowCount.toLocaleString()}
          </span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Columns
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {profile.columnCount}
          </span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Missing Values
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {profile.missingValueCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({profile.missingDataPercentage}%)
            </span>
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Duplicate Rows
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {profile.duplicateRowCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({profile.duplicateRowPercentage}%)
            </span>
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            File Size
          </span>
          <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
            {formatBytes(profile.fileSizeBytes)}
          </span>
        </Card>

        <Card className="p-4 space-y-1">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Quality Score
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {profile.dataQualityScore}/100
            </span>
            <Badge variant={getQualityBadgeColor(profile.dataQualityScore)}>
              {profile.dataQualityScore >= 85 ? 'High' : profile.dataQualityScore >= 65 ? 'Fair' : 'Poor'}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Potential Target Candidates Banner */}
      {profile.potentialTargets && profile.potentialTargets.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20">
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-4 h-4" />
              <h3 className="text-sm font-semibold">
                Potential Target Candidates (Deterministic Heuristics)
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              The schema inference engine identified the following columns as candidate target variables for future predictive modeling.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {profile.potentialTargets.map((target) => (
                <div
                  key={target.columnName}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/40 space-y-1.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 font-mono">
                      {target.columnName}
                    </span>
                    <Badge variant="indigo">
                      {target.confidence} confidence
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    {target.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Deterministic Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'schema'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Inferred Schema ({profile.columns.length} columns)</span>
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'preview'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span>Data Preview (First 10 Rows)</span>
        </button>

        <button
          onClick={() => setActiveTab('quality')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'quality'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Data Quality Score Methodology</span>
        </button>
      </div>

      {/* Tab: Analytics Explorer */}
      {activeTab === 'analytics' && (
        <DatasetAnalyticsExplorer profile={profile} />
      )}

      {/* Tab: Schema & Column Profiles */}
      {activeTab === 'schema' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Column Name</th>
                  <th className="py-3 px-4">Logical Type</th>
                  <th className="py-3 px-4">Pandas Dtype</th>
                  <th className="py-3 px-4">Nulls</th>
                  <th className="py-3 px-4">Unique</th>
                  <th className="py-3 px-4">Sample Values</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {profile.columns.map((col) => {
                  const isExpanded = expandedColumn === col.name;
                  return (
                    <React.Fragment key={col.name}>
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{col.name}</span>
                          {col.isPotentialTarget && (
                            <Badge variant="indigo">
                              Target
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium capitalize">
                            {getLogicalTypeIcon(col.logicalType)}
                            {col.logicalType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                          {col.pandasDtype}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={
                              col.nullCount > 0
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : 'text-slate-500'
                            }
                          >
                            {col.nullCount} ({col.nullPercentage}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {col.uniqueCount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {col.sampleValues.slice(0, 3).map((val, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate max-w-[100px]"
                              >
                                {val === null ? 'null' : String(val)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleColumnExpand(col.name)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Column Statistics Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                          <td colSpan={7} className="p-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="space-y-3">
                              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                Detailed Statistics for {col.name}
                              </h4>

                              {col.logicalType === 'numeric' && col.statistics && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-semibold">MIN</span>
                                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {col.statistics.min !== null ? col.statistics.min : '—'}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-semibold">MAX</span>
                                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {col.statistics.max !== null ? col.statistics.max : '—'}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-semibold">MEAN</span>
                                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {col.statistics.mean !== null ? col.statistics.mean : '—'}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-semibold">MEDIAN</span>
                                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {col.statistics.median !== null ? col.statistics.median : '—'}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-semibold">STD DEV</span>
                                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {col.statistics.std !== null ? col.statistics.std : '—'}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-semibold">Q25 (25%)</span>
                                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {col.statistics.q25 !== null ? col.statistics.q25 : '—'}
                                    </span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    <span className="text-[10px] text-slate-400 block font-semibold">Q75 (75%)</span>
                                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {col.statistics.q75 !== null ? col.statistics.q75 : '—'}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {col.topValues && col.topValues.length > 0 && (
                                <div className="space-y-1.5">
                                  <span className="text-[11px] text-slate-500 font-semibold block">
                                    Top Frequent Values:
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {col.topValues.map((tv, idx) => (
                                      <div
                                        key={idx}
                                        className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono"
                                      >
                                        <span className="truncate max-w-[150px]">{tv.value}</span>
                                        <span className="text-slate-400 text-[11px]">
                                          {tv.count} ({tv.percentage}%)
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab: Data Preview (First 10 rows) */}
      {activeTab === 'preview' && (
        <Card className="overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Sample Dataset Preview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Displaying first {profile.previewRows?.length || 0} rows sent by the backend. Raw datasets are not loaded into browser memory.
              </p>
            </div>
            <Badge variant="secondary">
              Limited to 10 rows
            </Badge>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 w-12 text-center text-slate-400">
                    #
                  </th>
                  {profile.columns.map((col) => (
                    <th key={col.name} className="py-2.5 px-3 whitespace-nowrap">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {profile.previewRows?.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30">
                    <td className="py-2 px-3 border-r border-slate-100 dark:border-slate-800 text-center text-slate-400 text-[10px]">
                      {rowIdx + 1}
                    </td>
                    {profile.columns.map((col) => {
                      const val = row[col.name];
                      return (
                        <td key={col.name} className="py-2 px-3 whitespace-nowrap text-slate-800 dark:text-slate-200">
                          {val === null || val === undefined ? (
                            <span className="text-slate-400 italic">null</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab: Quality Score Methodology */}
      {activeTab === 'quality' && (
        <Card className="p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Data Quality Score Methodology
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              DataLens AI computes a deterministic data quality score out of 100 based on standard dataset hygiene criteria.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              Calculation Breakdown for {profile.fileName}:
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-mono">
              {profile.dataQualityExplanation}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                1. Missing Data Penalty (Max -35 pts)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Penalizes missing cells proportionally (<code className="font-mono text-[11px]">min(35, missing_% × 1.5)</code>). Current missing: {profile.missingDataPercentage}%.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                2. Duplicate Rows Penalty (Max -25 pts)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Penalizes duplicate records (<code className="font-mono text-[11px]">min(25, duplicate_% × 1.5)</code>). Current duplicates: {profile.duplicateRowPercentage}%.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                3. Empty Columns Penalty (Max -25 pts)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deducts 10 points for each column that is 100% empty, capped at 25 points.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                4. Zero Variance Penalty (Max -15 pts)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deducts 5 points for each single-value constant column with zero informational entropy.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
