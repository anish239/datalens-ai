import React, { useState, useEffect } from 'react';
import { DatasetProfile } from '../../../types/dataset';
import {
  TrainedModelResponse,
  ValidateMlResponse,
  MlTaskType,
  MlAlgorithm,
} from '../../../types/ml';
import {
  validateMlTask,
  trainAndEvaluateModel,
  listTrainedModels,
  deleteTrainedModel,
} from '../../../services/deterministicMl';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import {
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  BarChart2,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  RefreshCw,
  Trash2,
  Sliders,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Line,
} from 'recharts';

interface MachineLearningViewProps {
  profile: DatasetProfile;
  onSelectModelForWhatIf?: (model: TrainedModelResponse) => void;
}

export const MachineLearningView: React.FC<MachineLearningViewProps> = ({
  profile,
  onSelectModelForWhatIf,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [taskType, setTaskType] = useState<MlTaskType>('regression');
  const [algorithm, setAlgorithm] = useState<MlAlgorithm>('auto');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [splitRatio, setSplitRatio] = useState<number>(0.8);
  const [validation, setValidation] = useState<ValidateMlResponse | null>(null);

  const [isTraining, setIsTraining] = useState(false);
  const [trainedModel, setTrainedModel] = useState<TrainedModelResponse | null>(null);
  const [savedModels, setSavedModels] = useState<TrainedModelResponse[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize candidate target and features on load
  useEffect(() => {
    const numericCols = profile.numericColumns || [];
    const catCols = profile.categoricalColumns || [];

    const defaultTarget = numericCols[0] || catCols[0] || profile.columns[0]?.name || '';
    setSelectedTarget(defaultTarget);

    const initialFeatures = profile.columns
      .map((c) => c.name)
      .filter((name) => name !== defaultTarget);
    setSelectedFeatures(initialFeatures);

    refreshSavedModels();
  }, [profile.datasetId]);

  // Run validation whenever target or features change
  useEffect(() => {
    if (selectedTarget) {
      const val = validateMlTask(profile, selectedTarget, selectedFeatures, taskType);
      setValidation(val);
      if (val.recommendedTask && val.recommendedTask !== taskType) {
        setTaskType(val.recommendedTask as MlTaskType);
      }
    }
  }, [selectedTarget, selectedFeatures, profile.datasetId]);

  const refreshSavedModels = () => {
    const list = listTrainedModels(profile.datasetId);
    setSavedModels(list);
    if (list.length > 0 && !trainedModel) {
      setTrainedModel(list[0]);
    }
  };

  const handleToggleFeature = (colName: string) => {
    if (selectedFeatures.includes(colName)) {
      setSelectedFeatures(selectedFeatures.filter((c) => c !== colName));
    } else {
      setSelectedFeatures([...selectedFeatures, colName]);
    }
  };

  const handleSelectAllFeatures = () => {
    const all = profile.columns.map((c) => c.name).filter((n) => n !== selectedTarget);
    setSelectedFeatures(all);
  };

  const handleDeselectAllFeatures = () => {
    setSelectedFeatures([]);
  };

  const handleTrainModel = async () => {
    if (!selectedTarget) {
      setErrorMsg('Please select a target column to predict.');
      return;
    }
    if (selectedFeatures.length === 0) {
      setErrorMsg('Please select at least one feature column.');
      return;
    }

    try {
      setIsTraining(true);
      setErrorMsg(null);

      // Perform deterministic training with zero data leakage
      const result = trainAndEvaluateModel({
        profile,
        targetColumn: selectedTarget,
        featureColumns: selectedFeatures,
        task: taskType,
        algorithm,
        splitRatio,
      });

      setTrainedModel(result);
      refreshSavedModels();
    } catch (err: any) {
      console.error('Model training failed:', err);
      setErrorMsg(err.message || 'Failed to train machine learning model.');
    } finally {
      setIsTraining(false);
    }
  };

  const handleDeleteModel = (modelId: string) => {
    deleteTrainedModel(modelId);
    if (trainedModel?.id === modelId) {
      setTrainedModel(null);
    }
    refreshSavedModels();
  };

  return (
    <div className="space-y-6">
      {/* Overview & Mission Card */}
      <Card className="p-5 border-border bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-500" />
              <h3 className="text-base font-bold tracking-tight text-foreground">
                Predictive Machine Learning Engine
              </h3>
              <Badge variant="indigo" className="text-[10px] uppercase font-bold py-0.5">
                Deterministic Solver
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Train leakage-safe regression and classification models with held-out test evaluation,
              automated preprocessing (imputation, scaling, one-hot encoding), and feature importance ranking.
            </p>
          </div>

          {savedModels.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">
                {savedModels.length} {savedModels.length === 1 ? 'model' : 'models'} trained
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Main Grid: Config on Left, Model Evaluation on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Model Configuration & Training Form (4 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="p-5 border-border bg-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>Training Specification</span>
              </h4>
              <Badge variant="outline" className="text-[11px] font-mono">
                {taskType.toUpperCase()}
              </Badge>
            </div>

            {/* Target Column Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Target Column (Variable to Predict)</span>
                <span className="text-[10px] text-muted-foreground font-normal">Required</span>
              </label>
              <select
                value={selectedTarget}
                onChange={(e) => setSelectedTarget(e.target.value)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 text-foreground font-mono focus:ring-1 focus:ring-primary focus:outline-none"
              >
                {profile.columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.logicalType}, {c.uniqueCount} distinct)
                  </option>
                ))}
              </select>
            </div>

            {/* Task Type Switcher */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Task Objective</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTaskType('regression')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    taskType === 'regression'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Regression (Numeric)
                </button>
                <button
                  type="button"
                  onClick={() => setTaskType('classification')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    taskType === 'classification'
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Classification (Discrete)
                </button>
              </div>
            </div>

            {/* Algorithm Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Model Algorithm</label>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value as MlAlgorithm)}
                className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="auto">Auto Selection (Best Algorithm)</option>
                {taskType === 'regression' ? (
                  <>
                    <option value="random_forest_regressor">Random Forest Regressor</option>
                    <option value="gradient_boosting_regressor">Gradient Boosting Regressor</option>
                    <option value="linear_regression">Linear Regression (Ridge L2)</option>
                  </>
                ) : (
                  <>
                    <option value="random_forest_classifier">Random Forest Classifier</option>
                    <option value="gradient_boosting_classifier">Gradient Boosting Classifier</option>
                    <option value="logistic_regression">Logistic Regression (Multinomial)</option>
                  </>
                )}
              </select>
            </div>

            {/* Train/Test Split Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Train / Test Split Ratio</span>
                <span className="font-mono text-indigo-400">
                  {Math.round(splitRatio * 100)}% / {Math.round((1 - splitRatio) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.9"
                step="0.05"
                value={splitRatio}
                onChange={(e) => setSplitRatio(parseFloat(e.target.value))}
                className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
              />
              <p className="text-[11px] text-muted-foreground">
                Evaluated on held-out test data ({Math.round((1 - splitRatio) * 100)}%) without data leakage.
              </p>
            </div>

            {/* Feature Column Multi-Select */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Predictor Features ({selectedFeatures.length}/{profile.columns.length - 1})
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFeatures}
                    className="text-[11px] text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground text-xs">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllFeatures}
                    className="text-[11px] text-muted-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-border rounded-lg p-2 bg-background">
                {profile.columns
                  .filter((c) => c.name !== selectedTarget)
                  .map((col) => {
                    const isChecked = selectedFeatures.includes(col.name);
                    const isLeakageSuspect = validation?.leakageSuspectColumns.includes(col.name);

                    return (
                      <label
                        key={col.name}
                        className={`flex items-center justify-between p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                          isChecked ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleFeature(col.name)}
                            className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                          />
                          <span className="font-mono text-foreground truncate">{col.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isLeakageSuspect && (
                            <Badge variant="warning" className="text-[9px] py-0 px-1">
                              Leakage Suspect
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">{col.logicalType}</span>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>

            {/* Validation Warnings */}
            {validation && validation.warnings.length > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Validation Warnings</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {validation.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {errorMsg}
              </div>
            )}

            {/* Train Action Button */}
            <Button
              onClick={handleTrainModel}
              disabled={isTraining || selectedFeatures.length === 0}
              className="w-full gap-2 text-xs font-semibold py-2.5 shadow-sm"
            >
              {isTraining ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Training Deterministic Model...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Train & Evaluate Model</span>
                </>
              )}
            </Button>
          </Card>

          {/* Saved Models List */}
          {savedModels.length > 0 && (
            <Card className="p-4 border-border bg-card space-y-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
                Trained Model Registry
              </h4>
              <div className="space-y-2">
                {savedModels.map((m) => {
                  const isSelected = trainedModel?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setTrainedModel(m)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-xs'
                          : 'bg-background border-border hover:border-input'
                      }`}
                    >
                      <div className="space-y-0.5 truncate pr-2">
                        <div className="font-semibold text-foreground truncate">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>{m.algorithmDisplayName}</span>
                          <span>•</span>
                          <span className="font-mono">
                            {m.task === 'regression'
                              ? `R²: ${m.regressionMetrics?.r2.toFixed(3)}`
                              : `F1: ${m.classificationMetrics?.f1Macro.toFixed(3)}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteModel(m.id);
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete Model"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column: Model Evaluation Results & Visualizations (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {trainedModel ? (
            <>
              {/* Model Header Banner */}
              <Card className="p-5 border-border bg-card space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">{trainedModel.name}</h3>
                      <Badge variant="success" className="text-[10px] py-0.5 px-2">
                        Evaluated on Test Set
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      Target: <span className="text-foreground font-semibold">{trainedModel.targetColumn}</span> | {trainedModel.trainRowCount} train / {trainedModel.testRowCount} test rows
                    </p>
                  </div>

                  {onSelectModelForWhatIf && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectModelForWhatIf(trainedModel)}
                      className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run What-If Scenario</span>
                    </Button>
                  )}
                </div>

                {/* Key Metric Scorecards */}
                {trainedModel.task === 'regression' && trainedModel.regressionMetrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">R² Score</div>
                      <div className="text-xl font-bold font-mono text-indigo-500 mt-1">
                        {trainedModel.regressionMetrics.r2.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Variance explained</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">MAE</div>
                      <div className="text-xl font-bold font-mono text-foreground mt-1">
                        {trainedModel.regressionMetrics.mae.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Mean abs error</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">RMSE</div>
                      <div className="text-xl font-bold font-mono text-foreground mt-1">
                        {trainedModel.regressionMetrics.rmse.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Root mean sq error</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">MAPE</div>
                      <div className="text-xl font-bold font-mono text-foreground mt-1">
                        {trainedModel.regressionMetrics.mape !== undefined && trainedModel.regressionMetrics.mape !== null
                          ? `${trainedModel.regressionMetrics.mape.toFixed(1)}%`
                          : 'N/A'}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Mean abs pct error</div>
                    </div>
                  </div>
                )}

                {trainedModel.task === 'classification' && trainedModel.classificationMetrics && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Accuracy</div>
                      <div className="text-xl font-bold font-mono text-emerald-500 mt-1">
                        {(trainedModel.classificationMetrics.accuracy * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Overall accuracy</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Macro F1</div>
                      <div className="text-xl font-bold font-mono text-foreground mt-1">
                        {trainedModel.classificationMetrics.f1Macro.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Balanced F1 score</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Precision</div>
                      <div className="text-xl font-bold font-mono text-foreground mt-1">
                        {trainedModel.classificationMetrics.precisionMacro.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Macro precision</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border">
                      <div className="text-[11px] text-muted-foreground uppercase font-semibold">Recall</div>
                      <div className="text-xl font-bold font-mono text-foreground mt-1">
                        {trainedModel.classificationMetrics.recallMacro.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Macro recall</div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Feature Importance Chart */}
              <Card className="p-5 border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-indigo-400" />
                    <span>Feature Importance Ranking</span>
                  </h4>
                  <span className="text-[11px] text-muted-foreground">Normalized relative weight</span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={trainedModel.featureImportance}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis type="number" unit="%" domain={[0, 'dataMax + 5']} />
                      <YAxis
                        type="category"
                        dataKey="feature"
                        tick={{ fontSize: 11 }}
                        width={75}
                      />
                      <Tooltip
                        formatter={(val: any) => [`${val}%`, 'Importance']}
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                      />
                      <Bar
                        dataKey="normalizedPercentage"
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Regression: Actual vs Predicted Scatter Chart */}
              {trainedModel.task === 'regression' && trainedModel.actualVsPredicted && (
                <Card className="p-5 border-border bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>Actual vs. Predicted (Test Sample)</span>
                    </h4>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Mean Residual: {trainedModel.regressionMetrics?.residualMean}
                    </span>
                  </div>

                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis
                          dataKey="actual"
                          name="Actual Value"
                          tick={{ fontSize: 11 }}
                          label={{ value: 'Actual Test Target', position: 'insideBottom', offset: -5, fontSize: 10 }}
                        />
                        <YAxis
                          dataKey="predicted"
                          name="Predicted Value"
                          tick={{ fontSize: 11 }}
                          label={{ value: 'Model Prediction', angle: -90, position: 'insideLeft', fontSize: 10 }}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                        />
                        <Scatter
                          name="Test Predictions"
                          data={trainedModel.actualVsPredicted}
                          fill="hsl(var(--primary))"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              )}

              {/* Classification: Confusion Matrix */}
              {trainedModel.task === 'classification' && trainedModel.classificationMetrics && (
                <Card className="p-5 border-border bg-card space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Confusion Matrix (Held-out Test)</span>
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 border border-border bg-muted/40 text-left">Actual \ Predicted</th>
                          {trainedModel.classificationMetrics.confusionMatrix.labels.map((lbl) => (
                            <th key={lbl} className="p-2 border border-border bg-muted/40 font-mono">
                              {lbl}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trainedModel.classificationMetrics.confusionMatrix.labels.map((rowLabel, rIdx) => (
                          <tr key={rowLabel}>
                            <td className="p-2 border border-border font-semibold text-left bg-muted/20 font-mono">
                              {rowLabel}
                            </td>
                            {trainedModel.classificationMetrics!.confusionMatrix.matrix[rIdx].map((cnt, cIdx) => {
                              const isDiagonal = rIdx === cIdx;
                              return (
                                <td
                                  key={cIdx}
                                  className={`p-2 border border-border font-mono ${
                                    isDiagonal ? 'bg-emerald-500/15 font-bold text-emerald-500' : 'text-muted-foreground'
                                  }`}
                                >
                                  {cnt}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Preprocessing & Governance Summary */}
              <Card className="p-4 border-border bg-muted/20 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Methodology & Governance Assurance</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-muted-foreground text-[11px]">
                  <div>
                    <span className="font-semibold text-foreground">Imputation: </span>
                    Median (numeric), Mode (categorical)
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Encoding: </span>
                    One-Hot (max 20 categories)
                  </div>
                  <div>
                    <span className="font-semibold text-foreground">Scaling: </span>
                    StandardScaler (zero-mean, unit-var)
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center border-dashed border-2 border-border bg-card">
              <div className="max-w-md mx-auto space-y-3">
                <div className="h-12 w-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                  <Cpu className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-foreground">Ready to Train Machine Learning Model</h4>
                <p className="text-xs text-muted-foreground">
                  Select a target variable and candidate predictors in the configuration panel on the left, then click{' '}
                  <span className="font-semibold text-foreground">Train & Evaluate Model</span> to generate deterministic evaluation metrics.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
