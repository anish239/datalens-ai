import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
} from 'recharts';
import { BarChart3, TrendingUp, ScatterChart as ScatterIcon, Layers } from 'lucide-react';
import { AiVisualizationSpec } from '../../types/ai';
import { DatasetProfile } from '../../types/dataset';
import {
  computeDeterministicGroupBy,
  computeDeterministicTrends,
  computeDeterministicDistribution,
  computeDeterministicColumnStats,
} from '../../services/deterministicMath';

interface AiAnalystVisualizationProps {
  spec: AiVisualizationSpec;
  profile: DatasetProfile;
}

export function AiAnalystVisualization({ spec, profile }: AiAnalystVisualizationProps) {
  const chartData = useMemo(() => {
    if (spec.data && spec.data.length > 0) {
      return spec.data.map((item: any) => ({
        ...item,
        name: String(item.name ?? item.category ?? item[spec.xAxis || ''] ?? 'Uncategorized'),
        value: typeof item.value === 'number' ? item.value : (typeof item.mean === 'number' ? item.mean : Number(item[spec.yAxis || '']) || 0),
      }));
    }

    // Compute chart points from spec parameters
    const xCol = spec.xAxis || profile.categoricalColumns[0] || profile.columns[0]?.name;
    const yCol = spec.yAxis || profile.numericColumns[0];
    const type = spec.type || 'bar';

    if (type === 'bar' && xCol) {
      if (yCol) {
        const gb = computeDeterministicGroupBy(profile, {
          by: xCol,
          aggregations: [{ column: yCol, function: (spec.aggregation as any) || 'mean' }],
          limit: 15,
        });
        const aggKey = `${spec.aggregation || 'mean'}_${yCol}`;
        return gb.groups.map((g) => ({
          name: String(g[xCol]),
          value: Number(g[aggKey]) || 0,
        }));
      } else {
        const stats = computeDeterministicColumnStats(profile, xCol);
        return (stats.categorical?.topCategories || []).slice(0, 15).map((c) => ({
          name: c.value,
          value: c.count,
        }));
      }
    } else if (type === 'line' && xCol && yCol) {
      const trends = computeDeterministicTrends(
        profile,
        xCol,
        yCol,
        'month',
        ((spec.aggregation as any) || 'sum')
      );
      return trends.points.map((p) => ({
        name: p.period,
        value: p.value,
      }));
    } else if (type === 'histogram' && xCol) {
      const dist = computeDeterministicDistribution(profile, xCol, 12);
      return dist.bins.map((b) => ({
        name: `${b.binStart.toFixed(0)}-${b.binEnd.toFixed(0)}`,
        value: b.count,
      }));
    }

    return [];
  }, [spec, profile]);

  if (!chartData || chartData.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {spec.type === 'line' ? (
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          ) : (
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          )}
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {spec.title || 'AI Recommended Visualization'}
          </span>
        </div>
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
          Type: {spec.type.toUpperCase()}
        </span>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {spec.type === 'line' ? (
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name={spec.yAxis || 'Metric'}
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#6366f1' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#64748b' }}
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="value" name={spec.yAxis || 'Value'} fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-2">
        <span>X-Axis: {spec.xAxis || 'Category'}</span>
        <span>Y-Axis: {spec.yAxis || 'Calculated Metric'} ({spec.aggregation || 'Aggregated'})</span>
      </div>
    </div>
  );
}
