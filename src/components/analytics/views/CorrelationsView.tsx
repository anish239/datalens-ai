import React, { useState, useEffect } from 'react';
import { DatasetProfile } from '../../../types/dataset';
import { CorrelationMatrixResponse, CorrelationPair } from '../../../types/analysis';
import { runCorrelation } from '../../../services/api';
import { ChartCard } from '../common/ChartCard';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface CorrelationsViewProps {
  profile: DatasetProfile;
}

export const CorrelationsView: React.FC<CorrelationsViewProps> = ({ profile }) => {
  const [method, setMethod] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');
  const [corrData, setCorrData] = useState<CorrelationMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPair, setSelectedPair] = useState<{ x: string; y: string } | null>(null);

  useEffect(() => {
    if (profile.numericColumns.length >= 2) {
      loadCorrelation();
    }
  }, [profile.datasetId, method]);

  const loadCorrelation = async () => {
    try {
      setLoading(true);
      setError(null);
      const envelope = await runCorrelation(profile.datasetId, { method }, profile);
      setCorrData(envelope.result);

      // Default selected pair
      if (envelope.result.strongestPositive.length > 0) {
        setSelectedPair({
          x: envelope.result.strongestPositive[0].columnA,
          y: envelope.result.strongestPositive[0].columnB,
        });
      } else if (profile.numericColumns.length >= 2) {
        setSelectedPair({
          x: profile.numericColumns[0],
          y: profile.numericColumns[1],
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to compute correlation matrix.');
    } finally {
      setLoading(false);
    }
  };

  if (profile.numericColumns.length < 2) {
    return (
      <div className="p-12 text-center bg-card border border-border rounded-xl">
        <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h4 className="font-semibold text-base text-foreground mb-1">Insufficient Numeric Features</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Correlation analysis requires at least 2 continuous numeric features. This dataset currently contains{' '}
          {profile.numericColumns.length} numeric column(s).
        </p>
      </div>
    );
  }

  // Get color for correlation value (-1 to 1)
  const getCorrColor = (val: number | null) => {
    if (val === null || isNaN(val)) return 'bg-muted text-muted-foreground';
    if (val === 1) return 'bg-primary/20 text-primary font-bold';
    if (val >= 0.7) return 'bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold';
    if (val >= 0.4) return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    if (val >= 0.1) return 'bg-emerald-500/5 text-foreground';
    if (val <= -0.7) return 'bg-rose-500/30 text-rose-600 dark:text-rose-400 font-semibold';
    if (val <= -0.4) return 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
    if (val <= -0.1) return 'bg-rose-500/5 text-foreground';
    return 'bg-muted/40 text-muted-foreground';
  };

  // Scatter plot data for selected pair
  const scatterPoints = (profile.previewRows || [])
    .filter(
      (r) =>
        selectedPair &&
        r[selectedPair.x] !== null &&
        r[selectedPair.x] !== undefined &&
        r[selectedPair.y] !== null &&
        r[selectedPair.y] !== undefined
    )
    .map((r) => ({
      x: Number(r[selectedPair!.x]),
      y: Number(r[selectedPair!.y]),
    }))
    .filter((p) => !isNaN(p.x) && !isNaN(p.y));

  const currentPairCorrelation =
    selectedPair && corrData?.matrix[selectedPair.x]?.[selectedPair.y] !== undefined
      ? corrData.matrix[selectedPair.x][selectedPair.y]
      : null;

  return (
    <div className="space-y-6">
      {/* Controls & Method Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        <div>
          <h3 className="font-bold text-base text-foreground">Bivariate Correlation Engine</h3>
          <p className="text-xs text-muted-foreground">
            Evaluating pairwise statistical co-movement across {profile.numericColumns.length} continuous features
          </p>
        </div>

        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          {(['pearson', 'spearman', 'kendall'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                method === m
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Methodological Caution Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-600 dark:text-amber-400">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block">Correlation vs Causation Reminder:</span>
          A high correlation coefficient indicates statistical co-variation, but does not prove a direct causal mechanism. Confounding variables, reverse causality, or sampling biases may be present.
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-card rounded-xl border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Computing pairwise {method} correlation coefficients...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      ) : corrData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heatmap Matrix Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 shadow-xs overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm text-foreground">
                  Correlation Heatmap ({corrData.method.toUpperCase()})
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-block w-2.5 h-2.5 rounded-xs bg-rose-500/30" /> -1.0 (Inverse)
                  <span className="inline-block w-2.5 h-2.5 rounded-xs bg-muted" /> 0.0 (None)
                  <span className="inline-block w-2.5 h-2.5 rounded-xs bg-emerald-500/30" /> +1.0 (Direct)
                </div>
              </div>

              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left font-mono text-[11px] text-muted-foreground bg-muted/40 sticky top-0 left-0 z-20 border-b border-r border-border">
                        Feature
                      </th>
                      {corrData.columns.map((col) => (
                        <th
                          key={col}
                          className="p-2 font-mono text-[11px] font-semibold text-foreground bg-muted/40 sticky top-0 z-10 border-b border-r border-border whitespace-nowrap min-w-[70px]"
                        >
                          {col.length > 10 ? `${col.substring(0, 8)}..` : col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono text-xs">
                    {corrData.columns.map((rowCol) => (
                      <tr key={rowCol}>
                        <td className="p-2 text-left font-semibold text-foreground bg-muted/30 sticky left-0 z-10 border-r border-border whitespace-nowrap">
                          {rowCol}
                        </td>
                        {corrData.columns.map((col) => {
                          const val = corrData.matrix[rowCol]?.[col];
                          const isSelected =
                            selectedPair &&
                            ((selectedPair.x === rowCol && selectedPair.y === col) ||
                              (selectedPair.x === col && selectedPair.y === rowCol));

                          return (
                            <td
                              key={col}
                              onClick={() => {
                                if (rowCol !== col) {
                                  setSelectedPair({ x: rowCol, y: col });
                                }
                              }}
                              className={`p-2 transition-all cursor-pointer border-r border-border/50 ${getCorrColor(
                                val
                              )} ${
                                isSelected ? 'ring-2 ring-primary ring-inset font-bold z-10' : 'hover:opacity-80'
                              }`}
                              title={`${rowCol} vs ${col}: ${val !== null && val !== undefined ? val.toFixed(3) : 'N/A'}`}
                            >
                              {val !== null && val !== undefined ? val.toFixed(2) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Positive & Negative Correlations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strongest Positive */}
              <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
                <h5 className="font-semibold text-xs text-emerald-500 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                  <TrendingUp className="w-3.5 h-3.5" /> Strongest Direct Associations
                </h5>
                <div className="space-y-2">
                  {corrData.strongestPositive.length > 0 ? (
                    corrData.strongestPositive.map((pair, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedPair({ x: pair.columnA, y: pair.columnB })}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted cursor-pointer transition-colors text-xs font-mono"
                      >
                        <div className="truncate">
                          <span className="text-foreground font-medium">{pair.columnA}</span>
                          <span className="text-muted-foreground mx-1">&</span>
                          <span className="text-foreground font-medium">{pair.columnB}</span>
                        </div>
                        <span className="font-bold text-emerald-500 ml-2">
                          +{pair.correlation.toFixed(3)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No significant positive correlations found.</p>
                  )}
                </div>
              </div>

              {/* Strongest Negative */}
              <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
                <h5 className="font-semibold text-xs text-rose-500 flex items-center gap-1.5 uppercase tracking-wider mb-2">
                  <TrendingDown className="w-3.5 h-3.5" /> Strongest Inverse Associations
                </h5>
                <div className="space-y-2">
                  {corrData.strongestNegative.length > 0 ? (
                    corrData.strongestNegative.map((pair, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedPair({ x: pair.columnA, y: pair.columnB })}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted cursor-pointer transition-colors text-xs font-mono"
                      >
                        <div className="truncate">
                          <span className="text-foreground font-medium">{pair.columnA}</span>
                          <span className="text-muted-foreground mx-1">&</span>
                          <span className="text-foreground font-medium">{pair.columnB}</span>
                        </div>
                        <span className="font-bold text-rose-500 ml-2">
                          {pair.correlation.toFixed(3)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No significant inverse correlations found.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Scatter Plot Drilldown */}
          <div className="lg:col-span-1 space-y-4">
            {selectedPair ? (
              <ChartCard
                id={`scatter-${selectedPair.x}-${selectedPair.y}`}
                title="Bivariate Scatter Dispersion"
                subtitle={`${selectedPair.x} (X) vs ${selectedPair.y} (Y)`}
                badge={
                  currentPairCorrelation !== null
                    ? `r = ${currentPairCorrelation > 0 ? '+' : ''}${currentPairCorrelation.toFixed(3)}`
                    : undefined
                }
                methodology={`Deterministic ${method} association`}
                data={scatterPoints}
                metadata={{
                  xAxis: selectedPair.x,
                  yAxis: selectedPair.y,
                  correlation: currentPairCorrelation,
                  sampleSize: scatterPoints.length,
                }}
                heightClass="h-96"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name={selectedPair.x}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name={selectedPair.y}
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      formatter={(val: number, name: string) => [val.toLocaleString(), name]}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Scatter name="Observations" data={scatterPoints} fill="#3b82f6" opacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </ChartCard>
            ) : (
              <div className="p-8 bg-card border border-border rounded-xl text-center text-xs text-muted-foreground">
                Click any cell in the heatmap matrix above to inspect bivariate scatter dispersion.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
