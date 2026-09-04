import React, { useState, useEffect } from 'react';
import { DatasetProfile } from '../../../types/dataset';
import { TrendResponse } from '../../../types/analysis';
import { runTrends } from '../../../services/api';
import { ChartCard } from '../common/ChartCard';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  CalendarDays,
} from 'lucide-react';

interface TrendsViewProps {
  profile: DatasetProfile;
}

export const TrendsView: React.FC<TrendsViewProps> = ({ profile }) => {
  const [dateCol, setDateCol] = useState<string>(
    profile.datetimeColumns[0] || profile.columns[0]?.name || ''
  );
  const [valCol, setValCol] = useState<string>(
    profile.numericColumns[0] || profile.columns[0]?.name || ''
  );
  const [freq, setFreq] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [agg, setAgg] = useState<'sum' | 'mean' | 'median' | 'count'>('sum');

  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dateCol && valCol) {
      loadTrends();
    }
  }, [profile.datasetId, dateCol, valCol, freq, agg]);

  const loadTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      const envelope = await runTrends(
        profile.datasetId,
        {
          dateColumn: dateCol,
          valueColumn: valCol,
          frequency: freq,
          aggregation: agg,
        },
        profile
      );
      setTrendData(envelope.result);
    } catch (err: any) {
      setError(err.message || 'Failed to compute trend analysis.');
    } finally {
      setLoading(false);
    }
  };

  if (profile.datetimeColumns.length === 0) {
    return (
      <div className="p-12 text-center bg-card border border-border rounded-xl">
        <CalendarDays className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h4 className="font-semibold text-base text-foreground mb-1">No Datetime Features Detected</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Trend and time-series analysis requires at least one date or timestamp column. None of the features in this dataset were recognized as valid ISO dates.
        </p>
      </div>
    );
  }

  const chartData = (trendData?.points || []).map((p) => ({
    period: p.period,
    value: p.value,
    count: p.count,
  }));

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h3 className="font-bold text-base text-foreground">Time-Series & Trend Analysis</h3>
            <p className="text-xs text-muted-foreground">
              Resample chronological observations and track trajectory over temporal horizons
            </p>
          </div>
          {trendData && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Trajectory:</span>
              <span
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                  trendData.trendDirection === 'increasing'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : trendData.trendDirection === 'decreasing'
                    ? 'bg-rose-500/10 text-rose-500'
                    : 'bg-primary/10 text-primary'
                }`}
              >
                {trendData.trendDirection === 'increasing' && <TrendingUp className="w-3.5 h-3.5" />}
                {trendData.trendDirection === 'decreasing' && <TrendingDown className="w-3.5 h-3.5" />}
                {trendData.trendDirection === 'stable' && <Activity className="w-3.5 h-3.5" />}
                {trendData.trendDirection}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Datetime Column */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
              Datetime Column
            </label>
            <select
              value={dateCol}
              onChange={(e) => setDateCol(e.target.value)}
              className="w-full text-xs bg-background border border-input rounded-lg p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              {profile.datetimeColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Column */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
              Numeric Metric
            </label>
            <select
              value={valCol}
              onChange={(e) => setValCol(e.target.value)}
              className="w-full text-xs bg-background border border-input rounded-lg p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              {profile.numericColumns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
              Temporal Cadence
            </label>
            <select
              value={freq}
              onChange={(e) => setFreq(e.target.value as any)}
              className="w-full text-xs bg-background border border-input rounded-lg p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary capitalize"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="quarter">Quarterly</option>
              <option value="year">Yearly</option>
            </select>
          </div>

          {/* Aggregation */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
              Aggregation
            </label>
            <select
              value={agg}
              onChange={(e) => setAgg(e.target.value as any)}
              className="w-full text-xs bg-background border border-input rounded-lg p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary uppercase font-mono"
            >
              <option value="sum">Sum (Total)</option>
              <option value="mean">Mean (Average)</option>
              <option value="median">Median</option>
              <option value="count">Count (Observations)</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-card rounded-xl border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Aggregating time-series timeline...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      ) : trendData ? (
        <div className="space-y-6">
          {/* Performance Summary KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-xl border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block">First Period Value</span>
              <div className="text-xl font-bold font-mono text-foreground mt-1">
                {trendData.firstValue !== null ? trendData.firstValue.toLocaleString() : 'N/A'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                {chartData[0]?.period || 'Start'}
              </p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block">Last Period Value</span>
              <div className="text-xl font-bold font-mono text-foreground mt-1">
                {trendData.lastValue !== null ? trendData.lastValue.toLocaleString() : 'N/A'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                {chartData[chartData.length - 1]?.period || 'End'}
              </p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block">Net Absolute Shift</span>
              <div className="text-xl font-bold font-mono text-foreground mt-1">
                {trendData.absoluteChange !== null
                  ? `${trendData.absoluteChange > 0 ? '+' : ''}${trendData.absoluteChange.toLocaleString()}`
                  : 'N/A'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">End vs Start delta</p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border">
              <span className="text-[10px] text-muted-foreground uppercase block">Percentage Change</span>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  (trendData.percentageChange || 0) > 0
                    ? 'text-emerald-500'
                    : (trendData.percentageChange || 0) < 0
                    ? 'text-rose-500'
                    : 'text-foreground'
                }`}
              >
                {trendData.percentageChange !== null
                  ? `${trendData.percentageChange > 0 ? '+' : ''}${trendData.percentageChange.toFixed(1)}%`
                  : 'N/A'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Overall growth rate</p>
            </div>
          </div>

          {/* Area Chart */}
          <ChartCard
            id={`chart-trend-${dateCol}-${valCol}`}
            title={`${agg.toUpperCase()} of ${valCol} Timeline`}
            subtitle={`Resampled to ${freq} periods across ${dateCol}`}
            badge="Deterministic Time Series"
            methodology={`Pandas resample('${freq}').${agg}()`}
            data={chartData}
            metadata={{
              dateColumn: dateCol,
              valueColumn: valCol,
              frequency: freq,
              aggregation: agg,
              totalPeriods: chartData.length,
            }}
            heightClass="h-96"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                <XAxis
                  dataKey="period"
                  fontSize={11}
                  stroke="var(--muted-foreground)"
                  minTickGap={20}
                />
                <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(val: number) => [
                    `${val !== null ? val.toLocaleString() : 'N/A'}`,
                    `${agg.toUpperCase()}(${valCol})`,
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : null}
    </div>
  );
};
