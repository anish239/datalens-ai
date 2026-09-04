import React from 'react';
import { DatasetProfile } from '../../../types/dataset';
import { AnalyticsOverviewResponse } from '../../../types/analysis';
import { ChartCard } from '../common/ChartCard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  FileSpreadsheet,
  Columns,
  Sparkles,
  AlertTriangle,
  Copy,
  CheckCircle2,
  HelpCircle,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
} from 'lucide-react';

interface OverviewViewProps {
  profile: DatasetProfile;
  overview: AnalyticsOverviewResponse | null;
  onNavigateSection: (section: string) => void;
}

const TYPE_COLORS = {
  numeric: '#3b82f6', // blue
  categorical: '#10b981', // emerald
  datetime: '#8b5cf6', // purple
  boolean: '#f59e0b', // amber
  text: '#64748b', // slate
  unknown: '#94a3b8',
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  profile,
  overview,
  onNavigateSection,
}) => {
  // Feature type distribution for pie chart
  const featureTypeData = [
    { name: 'Numeric', value: profile.numericColumns.length, color: TYPE_COLORS.numeric },
    { name: 'Categorical', value: profile.categoricalColumns.length, color: TYPE_COLORS.categorical },
    { name: 'Datetime', value: profile.datetimeColumns.length, color: TYPE_COLORS.datetime },
    { name: 'Boolean', value: profile.booleanColumns.length, color: TYPE_COLORS.boolean },
    { name: 'Text', value: profile.textColumns.length, color: TYPE_COLORS.text },
  ].filter((d) => d.value > 0);

  // Missing values data for bar chart
  const missingData = (overview?.topMissingColumns || [])
    .filter((c) => c.nullPercentage > 0)
    .slice(0, 8)
    .map((c) => ({
      column: c.column.length > 14 ? `${c.column.substring(0, 12)}...` : c.column,
      fullName: c.column,
      nullPercentage: Number(c.nullPercentage.toFixed(1)),
      nullCount: c.nullCount,
    }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Rows */}
        <div className="bg-card text-card-foreground p-4 rounded-xl border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Rows</span>
            <FileSpreadsheet className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {profile.rowCount.toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Raw dataset records</p>
          </div>
        </div>

        {/* Total Columns */}
        <div className="bg-card text-card-foreground p-4 rounded-xl border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Features</span>
            <Columns className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {profile.columnCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {profile.numericColumns.length} num · {profile.categoricalColumns.length} cat · {profile.datetimeColumns.length} date
            </p>
          </div>
        </div>

        {/* Quality Score */}
        <div className="bg-card text-card-foreground p-4 rounded-xl border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Quality Score</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-foreground">
                {profile.dataQualityScore}
              </span>
              <span className="text-xs text-muted-foreground font-mono">/100</span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  profile.dataQualityScore >= 80
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : profile.dataQualityScore >= 60
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {overview?.dataQualityRating || 'Good'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Structural completeness</p>
          </div>
        </div>

        {/* Missing Values */}
        <div className="bg-card text-card-foreground p-4 rounded-xl border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Missing Cells</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {profile.missingDataPercentage.toFixed(1)}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {profile.missingValueCount.toLocaleString()} empty values
            </p>
          </div>
        </div>

        {/* Duplicate Rows */}
        <div className="bg-card text-card-foreground p-4 rounded-xl border border-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Duplicate Rows</span>
            <Copy className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {profile.duplicateRowCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {profile.duplicateRowPercentage.toFixed(1)}% of total rows
            </p>
          </div>
        </div>
      </div>

      {/* Autonomous AI Analyst Feature Banner */}
      <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 dark:from-indigo-950/40 dark:via-slate-900 dark:to-purple-950/40 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Autonomous AI Data Analyst Ready
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300">
                Deterministic Tools Grounding
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Ask natural language questions like &ldquo;Which factors drive outcomes?&rdquo;, &ldquo;Detect price anomalies&rdquo;, or &ldquo;Compare category trends&rdquo;. The AI orchestrates deterministic math operations to answer with verified quantitative proof.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateSection('ask_ai')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch AI Analyst &rarr;</span>
        </button>
      </div>

      {/* Summary Facts and Insights */}
      {overview?.summaryFacts && overview.summaryFacts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
          <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Key Dataset Insights
          </h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
            {overview.summaryFacts.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-muted/30 p-2.5 rounded-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overview Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Type Composition */}
        <ChartCard
          id="chart-overview-feature-composition"
          title="Feature Composition by Logical Type"
          subtitle="Distribution of columns across inferred statistical categories"
          badge="Schema Profile"
          methodology="Pandas dtype & semantic inference"
          data={featureTypeData}
          metadata={{
            datasetId: profile.datasetId,
            columnCount: profile.columnCount,
            numericCount: profile.numericColumns.length,
            categoricalCount: profile.categoricalColumns.length,
          }}
        >
          <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="w-full h-64 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={featureTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {featureTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`${val} columns`, 'Count']}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-44 space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                <span className="flex items-center gap-1.5 text-blue-500 font-medium">
                  <Hash className="w-3.5 h-3.5" /> Numeric
                </span>
                <span className="font-mono font-bold">{profile.numericColumns.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                  <Type className="w-3.5 h-3.5" /> Categorical
                </span>
                <span className="font-mono font-bold">{profile.categoricalColumns.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                <span className="flex items-center gap-1.5 text-purple-500 font-medium">
                  <Calendar className="w-3.5 h-3.5" /> Datetime
                </span>
                <span className="font-mono font-bold">{profile.datetimeColumns.length}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/40">
                <span className="flex items-center gap-1.5 text-amber-500 font-medium">
                  <ToggleLeft className="w-3.5 h-3.5" /> Boolean
                </span>
                <span className="font-mono font-bold">{profile.booleanColumns.length}</span>
              </div>
            </div>
          </div>
        </ChartCard>

        {/* Missing Values Breakdown */}
        <ChartCard
          id="chart-overview-missing-values"
          title="Missing Values by Feature"
          subtitle="Top columns with null or unpopulated cell counts"
          badge="Completeness"
          methodology="Null count / Total rows"
          data={missingData}
          metadata={{
            totalMissingCells: profile.missingValueCount,
            missingDataPercentage: profile.missingDataPercentage,
          }}
        >
          {missingData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={missingData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                <XAxis type="number" unit="%" domain={[0, 100]} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis dataKey="column" type="category" width={100} fontSize={11} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(val: number, name: string, item: any) => [
                    `${val}% (${item.payload.nullCount.toLocaleString()} missing rows)`,
                    'Missing Rate',
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="nullPercentage" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-foreground">Zero Missing Values Detected</p>
              <p className="text-xs mt-1">All cells across all {profile.columnCount} columns are fully populated.</p>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Target Candidates Card if detected */}
      {profile.potentialTargets.length > 0 && (
        <div className="bg-card border border-primary/20 rounded-xl p-5 shadow-xs bg-primary/5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Candidate Outcome Targets
            </h4>
            <span className="text-xs text-muted-foreground">
              Inferred from naming heuristics & distributions
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {profile.potentialTargets.map((target, i) => (
              <div
                key={i}
                className="bg-card p-3.5 rounded-lg border border-border flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-semibold text-sm text-foreground">
                      {target.columnName}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {target.confidence} Confidence
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{target.reason}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-border/40 flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">Type: {target.logicalType}</span>
                  <button
                    onClick={() => onNavigateSection('statistics')}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Inspect Stats &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
