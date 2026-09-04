import React, { useState, useEffect } from 'react';
import { DatasetProfile } from '../../../types/dataset';
import { DistributionResponse } from '../../../types/analysis';
import { runDistribution } from '../../../services/api';
import { ChartCard } from '../common/ChartCard';
import {
  BarChart,
  Bar,
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
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';

interface DistributionsViewProps {
  profile: DatasetProfile;
}

export const DistributionsView: React.FC<DistributionsViewProps> = ({ profile }) => {
  const [selectedColumn, setSelectedColumn] = useState<string>(
    profile.numericColumns[0] || profile.columns[0]?.name || ''
  );
  const [bins, setBins] = useState<number>(15);
  const [distData, setDistData] = useState<DistributionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedColumn) {
      loadDistribution();
    }
  }, [profile.datasetId, selectedColumn, bins]);

  const loadDistribution = async () => {
    try {
      setLoading(true);
      setError(null);
      const envelope = await runDistribution(
        profile.datasetId,
        {
          column: selectedColumn,
          bins,
        },
        profile
      );
      setDistData(envelope.result);
    } catch (err: any) {
      setError(err.message || 'Failed to compute distribution.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = (distData?.bins || []).map((b) => ({
    range: `${b.binStart.toLocaleString()} - ${b.binEnd.toLocaleString()}`,
    binStart: b.binStart,
    binEnd: b.binEnd,
    count: b.count,
    percentage: b.percentage,
  }));

  const skewness = distData?.skewness || 0;
  const kurtosis = distData?.kurtosis || 0;

  const skewnessText =
    skewness > 0.5
      ? 'Positively Skewed (Right-tailed, concentration of low values with high extreme outliers)'
      : skewness < -0.5
      ? 'Negatively Skewed (Left-tailed, concentration of high values with low extreme outliers)'
      : 'Approximately Symmetric (Bell-shaped Gaussian balance)';

  const kurtosisText =
    kurtosis > 1
      ? 'Leptokurtic (Heavy tails, sharp peak, elevated probability of extreme outlier events)'
      : kurtosis < -1
      ? 'Platykurtic (Light tails, flatter peak, spread-out dispersion)'
      : 'Mesokurtic (Standard Gaussian tail weight)';

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h3 className="font-bold text-base text-foreground">Continuous Distribution & Density</h3>
            <p className="text-xs text-muted-foreground">
              Evaluate frequency histograms, central moments, skewness, and tail heaviness
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-center">
          {/* Feature Selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
              Select Numeric Feature
            </label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full text-xs bg-background border border-input rounded-lg p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              {profile.numericColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Bins Slider */}
          <div className="sm:col-span-2 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-muted-foreground">Histogram Bin Granularity:</span>
              <span className="font-mono font-bold text-primary">{bins} Bins</span>
            </div>
            <input
              type="range"
              min={5}
              max={40}
              step={1}
              value={bins}
              onChange={(e) => setBins(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>5 Bins (Coarse Overview)</span>
              <span>40 Bins (Granular Density)</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-card rounded-xl border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Computing frequency bins and moments...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      ) : distData ? (
        <div className="space-y-6">
          {/* Statistical Moments Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Skewness Card */}
            <div className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  3rd Moment (Skewness)
                </span>
                <span className="font-mono font-bold text-base text-foreground">
                  {skewness.toFixed(3)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{skewnessText}</p>
            </div>

            {/* Kurtosis Card */}
            <div className="bg-card p-4 rounded-xl border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  4th Moment (Excess Kurtosis)
                </span>
                <span className="font-mono font-bold text-base text-foreground">
                  {kurtosis.toFixed(3)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{kurtosisText}</p>
            </div>
          </div>

          {/* Histogram Chart */}
          <ChartCard
            id={`chart-dist-${selectedColumn}`}
            title={`Frequency Distribution: ${selectedColumn}`}
            subtitle={`Equal-width histogram partition into ${bins} intervals across range [${distData.min}, ${distData.max}]`}
            badge="Distribution Density"
            methodology={`NumPy histogram(bins=${bins}) with sample size N=${distData.count}`}
            data={chartData}
            metadata={{
              column: selectedColumn,
              bins,
              mean: distData.mean,
              median: distData.median,
              std: distData.std,
              skewness: distData.skewness,
              kurtosis: distData.kurtosis,
            }}
            heightClass="h-96"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="range"
                  angle={-30}
                  textAnchor="end"
                  fontSize={10}
                  interval={0}
                  stroke="var(--muted-foreground)"
                />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(val: number, name: string, item: any) => [
                    `${val.toLocaleString()} records (${item.payload.percentage}%)`,
                    'Count',
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Percentiles Breakdown */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">
              Distribution Percentile Slices
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 text-center font-mono">
              {Object.entries(distData.percentiles || {}).map(([pct, val]) => (
                <div key={pct} className="bg-muted/40 p-2 rounded-md border border-border/50">
                  <span className="text-[10px] text-muted-foreground block uppercase">{pct}</span>
                  <span className="text-xs font-semibold text-foreground">
                    {val !== null ? val.toLocaleString() : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
