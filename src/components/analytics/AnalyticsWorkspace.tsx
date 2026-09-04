import React, { useState, useEffect } from 'react';
import { DatasetProfile } from '../../types/dataset';
import { AnalyticsOverviewResponse } from '../../types/analysis';
import { RecommendedChart } from '../../types/visualization';
import { getAnalyticsOverview } from '../../services/api';
import { AutoChartRecommender } from './common/AutoChartRecommender';
import { OverviewView } from './views/OverviewView';
import { DataTableView } from './views/DataTableView';
import { StatisticsView } from './views/StatisticsView';
import { CorrelationsView } from './views/CorrelationsView';
import { GroupByView } from './views/GroupByView';
import { OutliersView } from './views/OutliersView';
import { TrendsView } from './views/TrendsView';
import { DistributionsView } from './views/DistributionsView';
import { DataQualityView } from './views/DataQualityView';
import { MachineLearningView } from './views/MachineLearningView';
import { WhatIfSimulatorView } from './views/WhatIfSimulatorView';
import { AiAnalystPanel } from '../ai/AiAnalystPanel';
import {
  BarChart3,
  Table as TableIcon,
  Calculator,
  GitCommit,
  Layers,
  ShieldAlert,
  TrendingUp,
  Sliders,
  ShieldCheck,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  Download,
  ArrowLeft,
  RefreshCw,
  Cpu,
  Zap,
} from 'lucide-react';
import { exportDataAsJson } from './common/ChartExporter';
import { TrainedModelResponse } from '../../types/ml';

export type AnalyticsTab =
  | 'overview'
  | 'ask_ai'
  | 'predictions'
  | 'what_if'
  | 'data'
  | 'statistics'
  | 'correlation'
  | 'groupby'
  | 'outliers'
  | 'trends'
  | 'distribution'
  | 'quality';

interface AnalyticsWorkspaceProps {
  profile: DatasetProfile;
  onBack?: () => void;
}

export const AnalyticsWorkspace: React.FC<AnalyticsWorkspaceProps> = ({
  profile,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [initialStatCol, setInitialStatCol] = useState<string | undefined>(undefined);
  const [activeModelForWhatIf, setActiveModelForWhatIf] = useState<TrainedModelResponse | null>(null);

  useEffect(() => {
    loadOverview();
  }, [profile.datasetId]);

  const loadOverview = async () => {
    try {
      setOverviewLoading(true);
      const data = await getAnalyticsOverview(profile.datasetId, profile);
      setOverview(data);
    } catch (e) {
      console.warn('Overview load warning:', e);
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleRecommendation = (rec: RecommendedChart) => {
    if (rec.category === 'trend') {
      setActiveTab('trends');
    } else if (rec.category === 'comparison') {
      setActiveTab('groupby');
    } else if (rec.category === 'correlation') {
      setActiveTab('correlation');
    } else if (rec.category === 'target' || rec.category === 'distribution') {
      setInitialStatCol(rec.primaryColumn);
      setActiveTab('statistics');
    }
  };

  const handleSelectModelForWhatIf = (model: TrainedModelResponse) => {
    setActiveModelForWhatIf(model);
    setActiveTab('what_if');
  };

  const navTabs: { id: AnalyticsTab; label: string; icon: React.ReactNode; count?: number; highlight?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    {
      id: 'ask_ai',
      label: 'AI Analyst',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      highlight: true,
    },
    {
      id: 'predictions',
      label: 'Predictions (ML)',
      icon: <Cpu className="w-4 h-4 text-indigo-500" />,
    },
    {
      id: 'what_if',
      label: 'What-If Simulator',
      icon: <Zap className="w-4 h-4 text-amber-500" />,
    },
    { id: 'data', label: 'Data Table', icon: <TableIcon className="w-4 h-4" />, count: profile.rowCount },
    { id: 'statistics', label: 'Statistics', icon: <Calculator className="w-4 h-4" />, count: profile.columnCount },
    { id: 'correlation', label: 'Correlations', icon: <GitCommit className="w-4 h-4" />, count: profile.numericColumns.length },
    { id: 'groupby', label: 'Group By', icon: <Layers className="w-4 h-4" /> },
    { id: 'outliers', label: 'Outliers', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'trends', label: 'Trends', icon: <TrendingUp className="w-4 h-4" />, count: profile.datetimeColumns.length },
    { id: 'distribution', label: 'Distributions', icon: <Sliders className="w-4 h-4" /> },
    { id: 'quality', label: 'Data Quality', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Back to Datasets"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-mono tracking-tight text-foreground">
                  {profile.fileName}
                </h2>
                <span className="text-xs uppercase font-bold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  {profile.fileType}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {(profile.fileSizeBytes / 1024).toFixed(1)} KB
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                <span>Created {new Date(profile.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span className="text-foreground font-medium">
                  {profile.rowCount.toLocaleString()} rows × {profile.columnCount} features
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={loadOverview}
              disabled={overviewLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border border-input rounded-lg hover:bg-muted text-foreground transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${overviewLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={() => exportDataAsJson(`${profile.fileName}_profile`, profile)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border border-input rounded-lg hover:bg-muted text-foreground transition-colors"
              title="Export Dataset Schema JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Schema</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 mt-5 pt-4 border-t border-border overflow-x-auto no-scrollbar">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted-foreground/15 text-muted-foreground'
                    }`}
                  >
                    {tab.count.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recommended Explorations Bar (Visible in Overview Tab) */}
      {activeTab === 'overview' && (
        <AutoChartRecommender
          profile={profile}
          onSelectRecommendation={handleRecommendation}
        />
      )}

      {/* Active Tab View Content */}
      <div className="transition-all duration-150">
        {activeTab === 'overview' && (
          <OverviewView
            profile={profile}
            overview={overview}
            onNavigateSection={(sec) => setActiveTab(sec as AnalyticsTab)}
          />
        )}

        {activeTab === 'ask_ai' && <AiAnalystPanel profile={profile} />}

        {activeTab === 'predictions' && (
          <MachineLearningView
            profile={profile}
            onSelectModelForWhatIf={handleSelectModelForWhatIf}
          />
        )}

        {activeTab === 'what_if' && (
          <WhatIfSimulatorView
            profile={profile}
            initialModel={activeModelForWhatIf}
          />
        )}

        {activeTab === 'data' && <DataTableView profile={profile} />}

        {activeTab === 'statistics' && (
          <StatisticsView profile={profile} initialColumn={initialStatCol} />
        )}

        {activeTab === 'correlation' && <CorrelationsView profile={profile} />}

        {activeTab === 'groupby' && <GroupByView profile={profile} />}

        {activeTab === 'outliers' && <OutliersView profile={profile} />}

        {activeTab === 'trends' && <TrendsView profile={profile} />}

        {activeTab === 'distribution' && <DistributionsView profile={profile} />}

        {activeTab === 'quality' && <DataQualityView profile={profile} />}
      </div>
    </div>
  );
};
