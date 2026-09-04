import React, { useState, useEffect } from 'react';
import { DatasetProfile } from '../../../types/dataset';
import {
  TrainedModelResponse,
  WhatIfResponse,
} from '../../../types/ml';
import {
  listTrainedModels,
  performWhatIfScenario,
  trainAndEvaluateModel,
} from '../../../services/deterministicMl';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import {
  Sparkles,
  Sliders,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface WhatIfSimulatorViewProps {
  profile: DatasetProfile;
  initialModel?: TrainedModelResponse | null;
}

export const WhatIfSimulatorView: React.FC<WhatIfSimulatorViewProps> = ({
  profile,
  initialModel,
}) => {
  const [availableModels, setAvailableModels] = useState<TrainedModelResponse[]>([]);
  const [selectedModel, setSelectedModel] = useState<TrainedModelResponse | null>(null);

  const [baselineFeatures, setBaselineFeatures] = useState<Record<string, any>>({});
  const [scenarioFeatures, setScenarioFeatures] = useState<Record<string, any>>({});
  const [whatIfResult, setWhatIfResult] = useState<WhatIfResponse | null>(null);

  // Load existing models or automatically fit default model if none exists
  useEffect(() => {
    const list = listTrainedModels(profile.datasetId);
    setAvailableModels(list);

    if (initialModel) {
      setSelectedModel(initialModel);
    } else if (list.length > 0) {
      setSelectedModel(list[0]);
    } else {
      // Auto-fit default model on first numeric column
      const defaultTarget = profile.numericColumns[0] || profile.columns[0]?.name;
      if (defaultTarget) {
        const autoModel = trainAndEvaluateModel({
          profile,
          targetColumn: defaultTarget,
        });
        setSelectedModel(autoModel);
        setAvailableModels([autoModel]);
      }
    }
  }, [profile.datasetId, initialModel]);

  // When model changes, initialize baseline and scenario values from sample records / medians
  useEffect(() => {
    if (selectedModel) {
      const initBaseline: Record<string, any> = {};
      const initScenario: Record<string, any> = {};

      const sampleRow = profile.previewRows?.[0] || {};

      selectedModel.featureColumns.forEach((colName) => {
        const colMeta = profile.columns.find((c) => c.name === colName);
        let val = sampleRow[colName];

        if (val === undefined || val === null) {
          if (colMeta?.logicalType === 'numeric') {
            val = 0;
          } else {
            val = colMeta?.topValues?.[0]?.value || 'Default';
          }
        }

        initBaseline[colName] = val;
        initScenario[colName] = val;
      });

      setBaselineFeatures(initBaseline);
      setScenarioFeatures(initScenario);
    }
  }, [selectedModel?.id]);

  // Recalculate scenario simulation whenever features change
  useEffect(() => {
    if (selectedModel && Object.keys(baselineFeatures).length > 0) {
      try {
        const res = performWhatIfScenario(
          selectedModel.id,
          baselineFeatures,
          scenarioFeatures
        );
        setWhatIfResult(res);
      } catch (err) {
        console.error('What-if execution error:', err);
      }
    }
  }, [selectedModel?.id, baselineFeatures, scenarioFeatures]);

  const handleScenarioChange = (colName: string, value: any) => {
    setScenarioFeatures((prev) => ({
      ...prev,
      [colName]: value,
    }));
  };

  const handleResetToBaseline = () => {
    setScenarioFeatures({ ...baselineFeatures });
  };

  if (!selectedModel) {
    return (
      <Card className="p-12 text-center border-dashed border-2 border-border bg-card">
        <div className="max-w-md mx-auto space-y-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-foreground">No Trained Models Available</h4>
          <p className="text-xs text-muted-foreground">
            Please train a model in the Machine Learning tab first to run interactive what-if scenarios.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <Card className="p-5 border-border bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold tracking-tight text-foreground">
                What-If Scenario Simulator
              </h3>
              <Badge variant="indigo" className="text-[10px] uppercase font-bold py-0.5">
                Deterministic Sensitivity
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Modify predictor variables in real time to simulate outcomes on{' '}
              <span className="font-semibold text-foreground">{selectedModel.targetColumn}</span>{' '}
              using the validated {selectedModel.algorithmDisplayName} model.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground">Active Model:</label>
            <select
              value={selectedModel.id}
              onChange={(e) => {
                const found = availableModels.find((m) => m.id === e.target.value);
                if (found) setSelectedModel(found);
              }}
              className="text-xs bg-background border border-input rounded-lg px-3 py-1.5 text-foreground font-mono focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.task})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Main Simulation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scenario Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-5 border-border bg-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Feature Scenario Inputs</span>
              </h4>
              <button
                type="button"
                onClick={handleResetToBaseline}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset to Baseline</span>
              </button>
            </div>

            <div className="space-y-4">
              {selectedModel.featureColumns.map((colName) => {
                const colMeta = profile.columns.find((c) => c.name === colName);
                const isNumeric = colMeta?.logicalType === 'numeric';
                const baseVal = baselineFeatures[colName];
                const scenVal = scenarioFeatures[colName];

                return (
                  <div
                    key={colName}
                    className="p-3 rounded-lg bg-background border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-foreground">{colName}</span>
                      <span className="text-[11px] text-muted-foreground">
                        Baseline:{' '}
                        <span className="font-mono text-foreground font-medium">
                          {typeof baseVal === 'number' ? baseVal.toLocaleString() : String(baseVal)}
                        </span>
                      </span>
                    </div>

                    {isNumeric ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={scenVal !== undefined ? scenVal : ''}
                          onChange={(e) => handleScenarioChange(colName, parseFloat(e.target.value) || 0)}
                          className="w-32 text-xs bg-muted border border-input rounded px-2.5 py-1 text-foreground font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                        <span className="text-xs text-muted-foreground font-mono">
                          {scenVal !== baseVal && (
                            <span className="text-indigo-400 font-semibold">
                              Δ {typeof scenVal === 'number' && typeof baseVal === 'number' ? (scenVal - baseVal > 0 ? `+${(scenVal - baseVal).toLocaleString()}` : (scenVal - baseVal).toLocaleString()) : ''}
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <select
                        value={scenVal || ''}
                        onChange={(e) => handleScenarioChange(colName, e.target.value)}
                        className="w-full text-xs bg-muted border border-input rounded px-2.5 py-1 text-foreground font-mono focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        {colMeta?.topValues?.map((tv) => (
                          <option key={tv.value} value={tv.value}>
                            {tv.value} ({tv.percentage.toFixed(0)}%)
                          </option>
                        )) || <option value={scenVal}>{scenVal}</option>}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Prediction Comparison & Delta Cards (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {whatIfResult && (
            <>
              {/* Comparative Prediction Card */}
              <Card className="p-5 border-border bg-card space-y-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Predicted Outcome Comparison</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-1">
                    <div className="text-[11px] text-muted-foreground uppercase font-semibold">
                      Baseline Target
                    </div>
                    <div className="text-xl font-bold font-mono text-foreground">
                      {whatIfResult.formattedBaseline}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Original condition</div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                    <div className="text-[11px] text-indigo-400 uppercase font-semibold">
                      Scenario Target
                    </div>
                    <div className="text-xl font-bold font-mono text-indigo-400">
                      {whatIfResult.formattedScenario}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Simulated condition</div>
                  </div>
                </div>

                {/* Delta Badge & Metric */}
                <div className="p-4 rounded-xl bg-background border border-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-foreground">Simulated Difference</div>
                    <div className="text-[11px] text-muted-foreground">
                      {whatIfResult.direction === 'increase'
                        ? 'Positive shift in expected value'
                        : whatIfResult.direction === 'decrease'
                        ? 'Negative shift in expected value'
                        : 'No measurable shift'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {whatIfResult.percentageDifference !== undefined && whatIfResult.percentageDifference !== null && (
                      <Badge
                        variant={
                          whatIfResult.percentageDifference > 0
                            ? 'success'
                            : whatIfResult.percentageDifference < 0
                            ? 'danger'
                            : 'outline'
                        }
                        className="text-xs font-mono font-bold py-1 px-2.5"
                      >
                        {whatIfResult.percentageDifference > 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 mr-1 inline" />
                        ) : whatIfResult.percentageDifference < 0 ? (
                          <TrendingDown className="w-3.5 h-3.5 mr-1 inline" />
                        ) : (
                          <Minus className="w-3.5 h-3.5 mr-1 inline" />
                        )}
                        {whatIfResult.percentageDifference > 0 ? `+${whatIfResult.percentageDifference.toFixed(1)}%` : `${whatIfResult.percentageDifference.toFixed(1)}%`}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Changed Features Summary */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="text-xs font-semibold text-foreground">
                    Active Driver Changes ({whatIfResult.changedFeatures.length})
                  </div>
                  {whatIfResult.changedFeatures.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">
                      No feature changes from baseline. Adjust inputs to see predicted impact.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {whatIfResult.changedFeatures.map((cf) => (
                        <div
                          key={cf.feature}
                          className="flex items-center justify-between text-xs p-2 rounded bg-muted/20"
                        >
                          <span className="font-mono text-foreground">{cf.feature}</span>
                          <span className="font-mono text-muted-foreground">
                            {String(cf.baselineValue)} →{' '}
                            <span className="text-foreground font-semibold">
                              {String(cf.scenarioValue)}
                            </span>{' '}
                            {cf.percentageDelta ? `(${cf.percentageDelta > 0 ? `+${cf.percentageDelta}%` : `${cf.percentageDelta}%`})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Caveats & Rigor Callout */}
              <Card className="p-4 border-border bg-muted/20 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Analytical Integrity Caveat</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  What-if sensitivity represents mathematical model inference under observed multivariate correlations. It does not establish causal proof. Results should be interpreted alongside domain expertise.
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
