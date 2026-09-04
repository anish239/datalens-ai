import React, { useState, useEffect } from 'react';
import { DatasetProfile } from '../../../types/dataset';
import { ColumnStatisticsResponse } from '../../../types/analysis';
import { getColumnStatistics } from '../../../services/api';
import { ChartCard } from '../common/ChartCard';
import { BoxPlot } from '../common/BoxPlot';
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
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Search,
  Loader2,
  AlertCircle,
  TrendingUp,
  BarChart2,
} from 'lucide-react';

interface StatisticsViewProps {
  profile: DatasetProfile;
  initialColumn?: string;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({
  profile,
  initialColumn,
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>(
    initialColumn || profile.columns[0]?.name || ''
  );
  const [filterType, setFilterType] = useState<string>('all');
  const [columnSearch, setColumnSearch] = useState<string>('');
  const [statData, setStatData] = useState<ColumnStatisticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedColumn) {
      loadStats(selectedColumn);
    }
  }, [selectedColumn, profile.datasetId]);

  const loadStats = async (col: string) => {
    try {
      setLoading(true);
      setError(null);
      const envelope = await getColumnStatistics(profile.datasetId, col, profile);
      setStatData(envelope.result);
    } catch (err: any) {
      setError(err.message || 'Failed to compute column statistics.');
    } finally {
      setLoading(false);
    }
  };

  const filteredColumns = profile.columns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(columnSearch.toLowerCase());
    const matchesType = filterType === 'all' || c.logicalType === filterType;
    return matchesSearch && matchesType;
  });

  const currentColProfile = profile.columns.find((c) => c.name === selectedColumn);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Column Selector Sidebar */}
      <div className="lg:col-span-1 bg-card border border-border rounded-xl p-4 space-y-3 h-fit">
        <h4 className="font-semibold text-sm text-foreground">Select Feature</h4>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search columns..."
            value={columnSearch}
            onChange={(e) => setColumnSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Type Filter Chips */}
        <div className="flex gap-1 flex-wrap pb-1 border-b border-border">
          {['all', 'numeric', 'categorical', 'datetime', 'boolean'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-full capitalize transition-colors ${
                filterType === t
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Column List */}
        <div className="max-h-[500px] overflow-y-auto space-y-1 pr-1">
          {filteredColumns.map((col) => {
            const isSelected = col.name === selectedColumn;
            return (
              <button
                key={col.name}
                onClick={() => setSelectedColumn(col.name)}
                className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between group ${
                  isSelected
                    ? 'bg-primary/10 text-primary border border-primary/30 font-semibold'
                    : 'hover:bg-muted text-foreground border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {col.logicalType === 'numeric' && <Hash className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                  {col.logicalType === 'categorical' && <Type className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  {col.logicalType === 'datetime' && <Calendar className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                  {col.logicalType === 'boolean' && <ToggleLeft className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                  <span className="truncate">{col.name}</span>
                </div>
                {col.nullCount > 0 && (
                  <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded-xs shrink-0">
                    {col.nullPercentage.toFixed(0)}% null
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Statistics Details */}
      <div className="lg:col-span-3 space-y-6">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center bg-card rounded-xl border border-border">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Calculating exact mathematical statistics...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
            <p className="text-sm font-semibold text-destructive">{error}</p>
          </div>
        ) : statData ? (
          <>
            {/* Header for Selected Column */}
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold font-mono text-foreground">{statData.column}</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                    {statData.logicalType}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pandas dtype: <span className="font-mono">{currentColProfile?.pandasDtype || 'auto'}</span> · Nulls:{' '}
                  {currentColProfile?.nullCount.toLocaleString()} ({currentColProfile?.nullPercentage.toFixed(1)}%)
                </p>
              </div>

              {/* Sample values chip */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-foreground">Sample:</span>
                {statData.sampleValues.slice(0, 4).map((s, i) => (
                  <span key={i} className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded-md text-foreground">
                    {String(s)}
                  </span>
                ))}
              </div>
            </div>

            {/* NUMERIC COLUMN STATISTICS */}
            {statData.logicalType === 'numeric' && statData.numeric && (
              <div className="space-y-6">
                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-card p-3 rounded-lg border border-border text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Mean</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {statData.numeric.mean !== undefined && statData.numeric.mean !== null
                        ? statData.numeric.mean.toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-card p-3 rounded-lg border border-border text-center">
                    <span className="text-[10px] text-primary uppercase tracking-wider font-bold block">Median</span>
                    <span className="font-mono font-bold text-sm text-primary">
                      {statData.numeric.median !== undefined && statData.numeric.median !== null
                        ? statData.numeric.median.toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-card p-3 rounded-lg border border-border text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Std Dev</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {statData.numeric.std !== undefined && statData.numeric.std !== null
                        ? statData.numeric.std.toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-card p-3 rounded-lg border border-border text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Min</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {statData.numeric.min !== undefined && statData.numeric.min !== null
                        ? statData.numeric.min.toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-card p-3 rounded-lg border border-border text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Max</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {statData.numeric.max !== undefined && statData.numeric.max !== null
                        ? statData.numeric.max.toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="bg-card p-3 rounded-lg border border-border text-center">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">IQR</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      {statData.numeric.iqr !== undefined && statData.numeric.iqr !== null
                        ? statData.numeric.iqr.toLocaleString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Box Plot Card */}
                {statData.numeric.min !== null &&
                  statData.numeric.max !== null &&
                  statData.numeric.q1 !== null &&
                  statData.numeric.q3 !== null &&
                  statData.numeric.median !== null && (
                    <ChartCard
                      id={`boxplot-${statData.column}`}
                      title="Five-Number Summary & Box Plot"
                      subtitle="Visual representation of quartiles, median, and dynamic range"
                      badge="Five-Number Summary"
                      methodology="Tukey 5-number summary (Min, Q1, Median, Q3, Max)"
                      heightClass="h-44"
                    >
                      <BoxPlot
                        min={statData.numeric.min!}
                        q1={statData.numeric.q1!}
                        median={statData.numeric.median!}
                        q3={statData.numeric.q3!}
                        max={statData.numeric.max!}
                      />
                    </ChartCard>
                  )}

                {/* Percentiles Matrix */}
                <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Calculated Percentiles (p1 through p99)
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 text-center font-mono">
                    {Object.entries(statData.numeric.percentiles || {}).map(([pct, val]) => (
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
            )}

            {/* CATEGORICAL COLUMN STATISTICS */}
            {(statData.logicalType === 'categorical' || statData.logicalType === 'text') &&
              statData.categorical && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-card p-3.5 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground uppercase block">Unique Values</span>
                      <span className="text-xl font-bold font-mono text-foreground">
                        {statData.categorical.uniqueCount.toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-card p-3.5 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground uppercase block">Top Mode Category</span>
                      <span className="text-sm font-bold font-mono text-foreground truncate block">
                        {statData.categorical.mostFrequentValue || 'N/A'}
                      </span>
                    </div>
                    <div className="bg-card p-3.5 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground uppercase block">Mode Frequency</span>
                      <span className="text-xl font-bold font-mono text-foreground">
                        {statData.categorical.mostFrequentCount?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="bg-card p-3.5 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground uppercase block">Mode Dominance</span>
                      <span className="text-xl font-bold font-mono text-foreground">
                        {statData.categorical.mostFrequentPercentage?.toFixed(1) || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Top Categories Frequency Bar Chart */}
                  <ChartCard
                    id={`cat-bar-${statData.column}`}
                    title={`Top Categories in ${statData.column}`}
                    subtitle="Frequency count and percentage representation of distinct categories"
                    badge="Frequency Distribution"
                    methodology="Count aggregation on unique categorical levels"
                    data={statData.categorical.topCategories}
                    metadata={{
                      uniqueCount: statData.categorical.uniqueCount,
                      totalObservations: statData.categorical.count,
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={statData.categorical.topCategories}
                        margin={{ top: 10, right: 20, left: 10, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                        <XAxis
                          dataKey="value"
                          angle={-30}
                          textAnchor="end"
                          fontSize={11}
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
                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}

            {/* DATETIME COLUMN STATISTICS */}
            {statData.logicalType === 'datetime' && statData.datetime && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-card p-3.5 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase block">Earliest Timestamp</span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      {statData.datetime.minDate || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-card p-3.5 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase block">Latest Timestamp</span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      {statData.datetime.maxDate || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-card p-3.5 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase block">Date Range Span</span>
                    <span className="text-xl font-bold font-mono text-foreground">
                      {statData.datetime.dateRangeDays?.toLocaleString() || 0} days
                    </span>
                  </div>
                  <div className="bg-card p-3.5 rounded-lg border border-border">
                    <span className="text-[10px] text-muted-foreground uppercase block">Inferred Cadence</span>
                    <span className="text-sm font-bold font-mono text-primary">
                      {statData.datetime.inferredFrequency || 'Irregular'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* BOOLEAN COLUMN STATISTICS */}
            {statData.logicalType === 'boolean' && statData.boolean && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                    <span className="text-xs font-semibold text-emerald-500 uppercase block">TRUE</span>
                    <span className="text-2xl font-bold font-mono text-emerald-500">
                      {statData.boolean.trueCount.toLocaleString()} ({statData.boolean.truePercentage}%)
                    </span>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-center">
                    <span className="text-xs font-semibold text-rose-500 uppercase block">FALSE</span>
                    <span className="text-2xl font-bold font-mono text-rose-500">
                      {statData.boolean.falseCount.toLocaleString()} ({statData.boolean.falsePercentage}%)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};
