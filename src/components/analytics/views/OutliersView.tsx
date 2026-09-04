import React, { useState, useEffect } from 'react';
import { DatasetProfile } from '../../../types/dataset';
import { OutlierResponse } from '../../../types/analysis';
import { runOutliers } from '../../../services/api';
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
  Loader2,
  AlertCircle,
  ShieldAlert,
  Sliders,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { exportDataAsCsv } from '../common/ChartExporter';

interface OutliersViewProps {
  profile: DatasetProfile;
}

export const OutliersView: React.FC<OutliersViewProps> = ({ profile }) => {
  const [selectedColumn, setSelectedColumn] = useState<string>(
    profile.numericColumns[0] || profile.columns[0]?.name || ''
  );
  const [method, setMethod] = useState<'iqr' | 'zscore'>('iqr');
  const [threshold, setThreshold] = useState<number>(1.5);
  const [outlierData, setOutlierData] = useState<OutlierResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedColumn) {
      loadOutliers();
    }
  }, [profile.datasetId, selectedColumn, method, threshold]);

  const loadOutliers = async () => {
    try {
      setLoading(true);
      setError(null);
      const envelope = await runOutliers(
        profile.datasetId,
        {
          column: selectedColumn,
          method,
          threshold,
          sampleLimit: 50,
        },
        profile
      );
      setOutlierData(envelope.result);
    } catch (err: any) {
      setError(err.message || 'Failed to detect outliers.');
    } finally {
      setLoading(false);
    }
  };

  const currentColProfile = profile.columns.find((c) => c.name === selectedColumn);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h3 className="font-bold text-base text-foreground">Statistical Outlier Detection</h3>
            <p className="text-xs text-muted-foreground">
              Identify extreme data observations violating distribution assumptions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Method:</span>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setMethod('iqr');
                  setThreshold(1.5);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md uppercase transition-colors ${
                  method === 'iqr'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                IQR (Tukey's Fences)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod('zscore');
                  setThreshold(3.0);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md uppercase transition-colors ${
                  method === 'zscore'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Z-Score (Standard Deviations)
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-center">
          {/* Column Select */}
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

          {/* Threshold Slider */}
          <div className="sm:col-span-2 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-muted-foreground">
                Sensitivity Multiplier ({method === 'iqr' ? 'Multiplier × IQR' : 'σ Standard Deviations'}):
              </span>
              <span className="font-mono font-bold text-primary">{threshold.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={method === 'iqr' ? 1.0 : 1.5}
              max={method === 'iqr' ? 3.5 : 5.0}
              step={0.1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{method === 'iqr' ? '1.0× (Strict / High Outliers)' : '1.5σ (Strict)'}</span>
              <span>{method === 'iqr' ? '3.0× (Extreme Outliers Only)' : '5.0σ (Extreme Only)'}</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center bg-card rounded-xl border border-border">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <p className="text-xs text-muted-foreground">Scanning observations for statistical anomalies...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      ) : outlierData ? (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] uppercase font-semibold">Outlier Count</span>
                <ShieldAlert className="w-4 h-4 text-destructive" />
              </div>
              <div className="text-2xl font-bold font-mono text-destructive">
                {outlierData.outlierCount.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {outlierData.outlierPercentage.toFixed(1)}% of valid observations
              </p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] uppercase font-semibold">Lower Bound Cutoff</span>
                <Sliders className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {outlierData.lowerBound !== null ? outlierData.lowerBound.toLocaleString() : 'N/A'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Values below this are outliers</p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] uppercase font-semibold">Upper Bound Cutoff</span>
                <Sliders className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {outlierData.upperBound !== null ? outlierData.upperBound.toLocaleString() : 'N/A'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Values above this are outliers</p>
            </div>

            <div className="bg-card p-4 rounded-xl border border-border">
              <div className="flex items-center justify-between text-muted-foreground mb-1">
                <span className="text-[10px] uppercase font-semibold">Valid Sample Size</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-foreground">
                {outlierData.validObservations.toLocaleString()}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Non-null numeric rows</p>
            </div>
          </div>

          {/* Box Plot with Highlighted Outlier Boundaries */}
          {currentColProfile?.statistics &&
            currentColProfile.statistics.min !== null &&
            currentColProfile.statistics.max !== null &&
            currentColProfile.statistics.q25 !== null &&
            currentColProfile.statistics.q75 !== null &&
            currentColProfile.statistics.median !== null && (
              <ChartCard
                id={`outlier-boxplot-${selectedColumn}`}
                title={`Outlier Boundary Visualization: ${selectedColumn}`}
                subtitle={`Showing normal distribution spread vs anomaly zones (threshold: ${threshold})`}
                badge={`${method.toUpperCase()} Anomaly Detection`}
                methodology={`Deterministic bounds: [${outlierData.lowerBound}, ${outlierData.upperBound}]`}
                heightClass="h-44"
              >
                <BoxPlot
                  min={currentColProfile.statistics.min!}
                  q1={currentColProfile.statistics.q25!}
                  median={currentColProfile.statistics.median!}
                  q3={currentColProfile.statistics.q75!}
                  max={currentColProfile.statistics.max!}
                  lowerBound={outlierData.lowerBound}
                  upperBound={outlierData.upperBound}
                  outlierPoints={outlierData.sampleOutliers.slice(0, 10).map((o) => Number(o[selectedColumn]))}
                />
              </ChartCard>
            )}

          {/* Sample Outlier Records Table */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <div>
                <h4 className="font-semibold text-sm text-foreground">
                  Detected Anomaly Records ({outlierData.sampleOutliers.length} samples)
                </h4>
                <p className="text-xs text-muted-foreground">
                  Inspecting top extreme observations and their statistical distance
                </p>
              </div>
              {outlierData.sampleOutliers.length > 0 && (
                <button
                  type="button"
                  onClick={() => exportDataAsCsv(`outliers_${selectedColumn}`, outlierData.sampleOutliers)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export Anomaly CSV
                </button>
              )}
            </div>

            {outlierData.sampleOutliers.length > 0 ? (
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="sticky top-0 bg-card border-b border-border text-[11px] text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3">Row #</th>
                      <th className="py-2 px-3 text-destructive font-bold">{selectedColumn} (Value)</th>
                      <th className="py-2 px-3">Deviation from Bound</th>
                      {profile.columns
                        .filter((c) => c.name !== selectedColumn)
                        .slice(0, 4)
                        .map((c) => (
                          <th key={c.name} className="py-2 px-3">
                            {c.name}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 text-[11px]">
                    {outlierData.sampleOutliers.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/40">
                        <td className="py-2 px-3 text-muted-foreground">{row.rowIndex || idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-destructive">
                          {Number(row[selectedColumn]).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-amber-500 font-semibold">
                          +{Number(row.deviation || 0).toLocaleString()}
                        </td>
                        {profile.columns
                          .filter((c) => c.name !== selectedColumn)
                          .slice(0, 4)
                          .map((c) => (
                            <td key={c.name} className="py-2 px-3 text-muted-foreground truncate max-w-[150px]">
                              {String(row[c.name] ?? 'null')}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">Zero Outliers Detected</p>
                <p className="text-xs mt-1">
                  All observations lie within the statistical boundary [
                  {outlierData.lowerBound?.toLocaleString()}, {outlierData.upperBound?.toLocaleString()}].
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
