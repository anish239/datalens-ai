export type ChartType = 'bar' | 'line' | 'area' | 'scatter' | 'histogram' | 'heatmap' | 'box_plot';

export interface ChartMetadata {
  chartType: ChartType;
  datasetId: string;
  datasetName?: string;
  columns: string[];
  aggregation?: string | null;
  method?: string | null;
  generatedAt: string;
  recordCount: number;
}

export interface RecommendedChart {
  id: string;
  title: string;
  description: string;
  chartType: ChartType;
  primaryColumn: string;
  secondaryColumn?: string;
  aggregation?: string;
  reason: string;
  category: 'trend' | 'comparison' | 'correlation' | 'distribution' | 'target';
}
