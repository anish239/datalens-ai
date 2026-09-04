import React from 'react';
import { DatasetProfile } from '../../../types/dataset';
import { RecommendedChart } from '../../../types/visualization';
import { TrendingUp, BarChart3, ScatterChart as ScatterIcon, Layers, Target, ChevronRight } from 'lucide-react';

interface AutoChartRecommenderProps {
  profile: DatasetProfile;
  onSelectRecommendation: (rec: RecommendedChart) => void;
}

export const AutoChartRecommender: React.FC<AutoChartRecommenderProps> = ({
  profile,
  onSelectRecommendation,
}) => {
  // Generate deterministic chart recommendations based purely on column schemas
  const recommendations: RecommendedChart[] = [];

  // 1. Time-series recommendation if datetime column exists
  if (profile.datetimeColumns.length > 0 && profile.numericColumns.length > 0) {
    recommendations.push({
      id: 'rec_trend_1',
      title: `${profile.numericColumns[0]} over Time`,
      description: `Chronological trajectory of ${profile.numericColumns[0]} aggregated across ${profile.datetimeColumns[0]}`,
      chartType: 'line',
      primaryColumn: profile.datetimeColumns[0],
      secondaryColumn: profile.numericColumns[0],
      aggregation: 'sum',
      reason: `Detected temporal feature '${profile.datetimeColumns[0]}'`,
      category: 'trend',
    });
  }

  // 2. Categorical aggregation recommendation
  if (profile.categoricalColumns.length > 0 && profile.numericColumns.length > 0) {
    recommendations.push({
      id: 'rec_comp_1',
      title: `Average ${profile.numericColumns[0]} by ${profile.categoricalColumns[0]}`,
      description: `Grouped comparison of mean ${profile.numericColumns[0]} across ${profile.categoricalColumns[0]} categories`,
      chartType: 'bar',
      primaryColumn: profile.categoricalColumns[0],
      secondaryColumn: profile.numericColumns[0],
      aggregation: 'mean',
      reason: `Primary categorical segment with numeric metric`,
      category: 'comparison',
    });
  }

  // 3. Correlation / bivariate scatter if 2+ numeric columns exist
  if (profile.numericColumns.length >= 2) {
    recommendations.push({
      id: 'rec_corr_1',
      title: `${profile.numericColumns[0]} vs ${profile.numericColumns[1]}`,
      description: `Bivariate dispersion evaluating linear association and clustering`,
      chartType: 'scatter',
      primaryColumn: profile.numericColumns[0],
      secondaryColumn: profile.numericColumns[1],
      reason: `Pair of continuous numeric variables`,
      category: 'correlation',
    });
  }

  // 4. Target variable recommendation if detected
  if (profile.potentialTargets.length > 0) {
    const target = profile.potentialTargets[0];
    recommendations.push({
      id: 'rec_target_1',
      title: `Outcome Target: ${target.columnName}`,
      description: `Distribution & variance analysis for candidate target '${target.columnName}'`,
      chartType: target.logicalType === 'numeric' ? 'histogram' : 'bar',
      primaryColumn: target.columnName,
      reason: target.reason,
      category: 'target',
    });
  }

  // 5. Numerical distribution of first metric
  if (profile.numericColumns.length > 0 && recommendations.length < 4) {
    recommendations.push({
      id: 'rec_dist_1',
      title: `${profile.numericColumns[0]} Distribution`,
      description: `Frequency histogram and central tendency evaluation`,
      chartType: 'histogram',
      primaryColumn: profile.numericColumns[0],
      reason: `Key continuous metric distribution`,
      category: 'distribution',
    });
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm text-foreground">Recommended Explorations</h4>
          <span className="text-[11px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            Schema-Inferred
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {recommendations.map((rec) => {
          let Icon = BarChart3;
          if (rec.category === 'trend') Icon = TrendingUp;
          if (rec.category === 'correlation') Icon = ScatterIcon;
          if (rec.category === 'target') Icon = Target;

          return (
            <button
              key={rec.id}
              onClick={() => onSelectRecommendation(rec)}
              className="text-left p-3.5 rounded-lg border border-border/80 hover:border-primary/50 hover:bg-accent/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5 text-primary">
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                    {rec.category}
                  </span>
                </div>
                <h5 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">
                  {rec.title}
                </h5>
                <p className="text-xs text-muted-foreground line-clamp-2">{rec.description}</p>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 text-xs text-primary font-medium">
                <span>Explore Chart</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
