import React, { useState } from 'react';
import {
  Download,
  Maximize2,
  Minimize2,
  Info,
  FileSpreadsheet,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { exportChartAsSvg, exportDataAsCsv, exportDataAsJson } from './ChartExporter';

interface ChartCardProps {
  id: string;
  title: string;
  subtitle?: string;
  methodology?: string;
  data?: Record<string, any>[];
  metadata?: Record<string, any>;
  badge?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  heightClass?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  id,
  title,
  subtitle,
  methodology,
  data,
  metadata,
  badge,
  children,
  actions,
  heightClass = 'h-80',
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  return (
    <>
      <div
        id={id}
        className={`bg-card text-card-foreground rounded-xl border border-border transition-all flex flex-col ${
          isFullscreen
            ? 'fixed inset-4 z-50 shadow-2xl overflow-y-auto bg-background p-6'
            : 'p-5 shadow-xs'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-base tracking-tight text-foreground">{title}</h3>
              {badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  {badge}
                </span>
              )}
              {methodology && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-normal bg-muted text-muted-foreground">
                  {methodology}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {actions}

            {metadata && (
              <button
                type="button"
                onClick={() => setShowMetadata(true)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                title="Chart Metadata"
              >
                <Info className="w-4 h-4" />
              </button>
            )}

            {data && data.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => exportDataAsCsv(title, data)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  title="Export Data as CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => exportDataAsJson(title, data)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  title="Export Data as JSON"
                >
                  <FileCode className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => exportChartAsSvg(id, title)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title="Export Chart as SVG"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`w-full relative ${isFullscreen ? 'flex-1 min-h-[500px]' : heightClass}`}>
          {children}
        </div>
      </div>

      {/* Metadata Modal */}
      {showMetadata && metadata && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground border border-border rounded-xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <h4 className="font-semibold text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Analytical Provenance
              </h4>
              <button
                onClick={() => setShowMetadata(false)}
                className="text-muted-foreground hover:text-foreground text-sm px-2 py-1 rounded-md hover:bg-muted"
              >
                Close
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted-foreground">Deterministic Engine:</span>
                <span className="font-mono font-medium text-foreground">Pandas / NumPy / SciPy</span>
              </div>
              {Object.entries(metadata).map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground capitalize">
                    {k.replace(/([A-Z])/g, ' $1')}:
                  </span>
                  <span className="font-mono text-foreground">
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
