import React, { useState, useEffect } from 'react';
import { DatasetProfile } from '../../../types/dataset';
import { DataQualityResponse } from '../../../types/analysis';
import { runDataQuality } from '../../../services/api';
import {
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface DataQualityViewProps {
  profile: DatasetProfile;
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({ profile }) => {
  const [qualityData, setQualityData] = useState<DataQualityResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuality();
  }, [profile.datasetId]);

  const loadQuality = async () => {
    try {
      setLoading(true);
      setError(null);
      const envelope = await runDataQuality(profile.datasetId, profile);
      setQualityData(envelope.result);
    } catch (err: any) {
      setError(err.message || 'Failed to compute data quality breakdown.');
    } finally {
      setLoading(false);
    }
  };

  const columnsWithIssues = profile.columns.filter(
    (c) => c.nullPercentage > 0 || c.uniqueCount === 1
  );

  return (
    <div className="space-y-6">
      {/* Quality Score Hero Card */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg text-foreground">DataLens Integrity & Health Index</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automated deterministic audit evaluating completeness, duplication, cardinality, and statistical readiness before downstream modeling or visualization.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                Composite Score
              </span>
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-3xl font-extrabold font-mono text-foreground">
                  {profile.dataQualityScore}
                </span>
                <span className="text-xs text-muted-foreground font-mono">/100</span>
              </div>
            </div>

            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                profile.dataQualityScore >= 85
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : profile.dataQualityScore >= 70
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}
            >
              {qualityData?.rating || 'Good'}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-card rounded-xl border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Auditing dataset health factors...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      ) : qualityData ? (
        <div className="space-y-6">
          {/* Factor Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {qualityData.factors.map((factor, i) => (
              <div key={i} className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-foreground">{factor.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        factor.penalty === 0
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {factor.penalty === 0 ? 'Passed (0 pts)' : `-${factor.penalty} pts`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{factor.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                  Impact Level: <span className="font-medium text-foreground">{factor.impact}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Affected Columns Audit Table */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <h4 className="font-semibold text-sm text-foreground">
                Column-Level Quality Diagnostics ({columnsWithIssues.length} columns flagged)
              </h4>
              <span className="text-xs text-muted-foreground">
                Showing fields requiring potential cleaning
              </span>
            </div>

            {columnsWithIssues.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground font-mono text-[11px]">
                      <th className="py-2.5 px-3">Column Name</th>
                      <th className="py-2.5 px-3">Logical Type</th>
                      <th className="py-2.5 px-3">Missing Values</th>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Actionable Remediation Advice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-xs">
                    {columnsWithIssues.map((col) => {
                      const severity =
                        col.nullPercentage > 30 ? 'High' : col.nullPercentage > 5 ? 'Medium' : 'Low';
                      const advice =
                        col.nullPercentage > 50
                          ? 'Consider dropping feature due to extreme sparsity (>50% missing).'
                          : col.logicalType === 'numeric'
                          ? 'Impute with median or train predictive imputer.'
                          : 'Impute with mode category or fill with "Unknown".';

                      return (
                        <tr key={col.name} className="hover:bg-muted/40 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-foreground">{col.name}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{col.logicalType}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-foreground">
                              {col.nullCount.toLocaleString()}
                            </span>{' '}
                            <span className="text-muted-foreground">
                              ({col.nullPercentage.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                severity === 'High'
                                  ? 'bg-rose-500/10 text-rose-500'
                                  : severity === 'Medium'
                                  ? 'bg-amber-500/10 text-amber-500'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {severity}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-xs text-muted-foreground">{advice}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">Pristine Quality Detected</p>
                <p className="text-xs mt-1">No missing cells or zero-variance anomalies across any features.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
