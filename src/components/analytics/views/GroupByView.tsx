import React, { useState, useEffect } from 'react';
import { DatasetProfile } from '../../../types/dataset';
import { GroupByResponse } from '../../../types/analysis';
import { runGroupBy } from '../../../services/api';
import { ChartCard } from '../common/ChartCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Loader2,
  AlertCircle,
  Layers,
  ArrowUpDown,
  Filter,
  FileSpreadsheet,
} from 'lucide-react';
import { exportDataAsCsv } from '../common/ChartExporter';

interface GroupByViewProps {
  profile: DatasetProfile;
}

export const GroupByView: React.FC<GroupByViewProps> = ({ profile }) => {
  const categoricalOrTextCols = [
    ...profile.categoricalColumns,
    ...profile.textColumns,
    ...profile.booleanColumns,
  ];

  const [groupCol, setGroupCol] = useState<string>(
    categoricalOrTextCols[0] || profile.columns[0]?.name || ''
  );
  const [aggCol, setAggCol] = useState<string>(
    profile.numericColumns[0] || profile.columns[0]?.name || ''
  );
  const [aggFunc, setAggFunc] = useState<
    'mean' | 'sum' | 'count' | 'median' | 'min' | 'max' | 'std' | 'nunique'
  >('mean');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [limit, setLimit] = useState<number>(20);

  const [gbData, setGbData] = useState<GroupByResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupCol && aggCol) {
      loadGroupBy();
    }
  }, [profile.datasetId, groupCol, aggCol, aggFunc, sortAsc, limit]);

  const loadGroupBy = async () => {
    try {
      setLoading(true);
      setError(null);
      const alias = `${aggFunc}_${aggCol}`;
      const envelope = await runGroupBy(
        profile.datasetId,
        {
          by: groupCol,
          aggregations: [{ column: aggCol, function: aggFunc, alias }],
          sortBy: alias,
          ascending: sortAsc,
          limit,
        },
        profile
      );
      setGbData(envelope.result);
    } catch (err: any) {
      setError(err.message || 'Failed to execute group-by aggregation.');
    } finally {
      setLoading(false);
    }
  };

  const currentAlias = `${aggFunc}_${aggCol}`;

  const chartData = (gbData?.groups || []).map((g) => ({
    name: String(g[groupCol] ?? 'N/A'),
    value: Number(g[currentAlias] ?? 0),
  }));

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h3 className="font-bold text-base text-foreground">Multi-Feature Group-By Aggregation</h3>
            <p className="text-xs text-muted-foreground">
              Segment records by categorical levels and compute summary statistics
            </p>
          </div>
          {gbData && gbData.truncated && (
            <span className="text-xs bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full font-medium">
              Showing top {limit} of {gbData.totalGroups.toLocaleString()} unique groups
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Grouping Column */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
              Group By Column
            </label>
            <select
              value={groupCol}
              onChange={(e) => setGroupCol(e.target.value)}
              className="w-full text-xs bg-background border border-input rounded-lg p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              {profile.columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.logicalType})
                </option>
              ))}
            </select>
          </div>

          {/* Aggregation Column */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
              Aggregate Column
            </label>
            <select
              value={aggCol}
              onChange={(e) => setAggCol(e.target.value)}
              className="w-full text-xs bg-background border border-input rounded-lg p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              {profile.columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.logicalType})
                </option>
              ))}
            </select>
          </div>

          {/* Function */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
              Function
            </label>
            <select
              value={aggFunc}
              onChange={(e) => setAggFunc(e.target.value as any)}
              className="w-full text-xs bg-background border border-input rounded-lg p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary uppercase font-mono"
            >
              <option value="mean">Mean (Average)</option>
              <option value="sum">Sum (Total)</option>
              <option value="median">Median</option>
              <option value="count">Count (Frequency)</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="std">Std Dev</option>
              <option value="nunique">Unique Count</option>
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
              Order
            </label>
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="w-full flex items-center justify-between text-xs bg-background border border-input rounded-lg p-2 text-foreground hover:bg-muted transition-colors font-medium"
            >
              <span>{sortAsc ? 'Ascending (Lowest First)' : 'Descending (Highest First)'}</span>
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Limit */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase block mb-1">
              Top Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full text-xs bg-background border border-input rounded-lg p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            >
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-card rounded-xl border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Aggregating {profile.rowCount.toLocaleString()} rows...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      ) : gbData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Chart */}
          <div className="lg:col-span-2">
            <ChartCard
              id="chart-groupby-bar"
              title={`${aggFunc.toUpperCase()} of ${aggCol} by ${groupCol}`}
              subtitle={`Comparing aggregated values across top ${chartData.length} distinct groups`}
              badge="Deterministic Aggregation"
              methodology={`Pandas DataFrame.groupby(['${groupCol}'])['${aggCol}'].${aggFunc}()`}
              data={chartData}
              metadata={{
                groupBy: groupCol,
                aggregateColumn: aggCol,
                function: aggFunc,
                totalGroups: gbData.totalGroups,
              }}
              heightClass="h-96"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis
                    dataKey="name"
                    angle={-30}
                    textAnchor="end"
                    fontSize={11}
                    interval={0}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip
                    formatter={(val: number) => [val.toLocaleString(), `${aggFunc.toUpperCase()}(${aggCol})`]}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Group-By Results Table */}
          <div className="lg:col-span-1 bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                  Aggregated Group Records
                </h4>
                <button
                  type="button"
                  onClick={() => exportDataAsCsv(`groupby_${groupCol}_${aggCol}`, gbData.groups)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export
                </button>
              </div>

              <div className="max-h-[380px] overflow-y-auto pr-1">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="sticky top-0 bg-card border-b border-border">
                    <tr>
                      <th className="py-1.5 px-2 text-muted-foreground">{groupCol}</th>
                      <th className="py-1.5 px-2 text-right text-muted-foreground">{currentAlias}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-[11px]">
                    {gbData.groups.map((g, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="py-1.5 px-2 text-foreground font-medium truncate max-w-[120px]">
                          {String(g[groupCol] ?? 'N/A')}
                        </td>
                        <td className="py-1.5 px-2 text-right text-foreground font-bold">
                          {Number(g[currentAlias] ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t border-border mt-3 text-[11px] text-muted-foreground flex justify-between">
              <span>{gbData.groups.length} groups listed</span>
              <span className="font-semibold">{gbData.totalGroups.toLocaleString()} total categories</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
