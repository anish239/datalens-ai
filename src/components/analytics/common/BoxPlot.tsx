import React from 'react';

interface BoxPlotProps {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  lowerBound?: number | null;
  upperBound?: number | null;
  outlierPoints?: number[];
  unit?: string;
  className?: string;
}

export const BoxPlot: React.FC<BoxPlotProps> = ({
  min,
  q1,
  median,
  q3,
  max,
  lowerBound,
  upperBound,
  outlierPoints = [],
  unit = '',
  className = '',
}) => {
  // Determine overall range
  const allValues = [min, q1, median, q3, max, ...(lowerBound ? [lowerBound] : []), ...(upperBound ? [upperBound] : []), ...outlierPoints].filter(
    (v) => typeof v === 'number' && !isNaN(v)
  );

  if (allValues.length === 0) {
    return <div className="text-center py-6 text-xs text-muted-foreground">No numerical data for box plot.</div>;
  }

  const rangeMin = Math.min(...allValues);
  const rangeMax = Math.max(...allValues);
  const span = rangeMax - rangeMin || 1;

  // Scale 0-100%
  const getPos = (val: number) => {
    return Math.max(0, Math.min(100, ((val - rangeMin) / span) * 100));
  };

  const posMin = getPos(min);
  const posQ1 = getPos(q1);
  const posMed = getPos(median);
  const posQ3 = getPos(q3);
  const posMax = getPos(max);

  return (
    <div className={`w-full py-4 px-2 space-y-3 ${className}`}>
      {/* Box & Whisker Visualization */}
      <div className="relative h-20 w-full flex items-center">
        {/* Outlier Shading if present */}
        {lowerBound !== undefined && lowerBound !== null && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-destructive/10 rounded-l-md border-r border-destructive/30 border-dashed"
            style={{ width: `${getPos(lowerBound)}%` }}
            title={`Outlier Lower Threshold: ${lowerBound}`}
          />
        )}
        {upperBound !== undefined && upperBound !== null && (
          <div
            className="absolute top-0 bottom-0 right-0 bg-destructive/10 rounded-r-md border-l border-destructive/30 border-dashed"
            style={{ width: `${100 - getPos(upperBound)}%` }}
            title={`Outlier Upper Threshold: ${upperBound}`}
          />
        )}

        {/* Whisker Line (Min to Max) */}
        <div
          className="absolute h-0.5 bg-foreground/50 top-1/2 -translate-y-1/2 transition-all"
          style={{
            left: `${posMin}%`,
            width: `${posMax - posMin}%`,
          }}
        />

        {/* Whisker Caps */}
        <div
          className="absolute w-0.5 h-6 bg-foreground/60 top-1/2 -translate-y-1/2"
          style={{ left: `${posMin}%` }}
          title={`Min: ${min}${unit}`}
        />
        <div
          className="absolute w-0.5 h-6 bg-foreground/60 top-1/2 -translate-y-1/2"
          style={{ left: `${posMax}%` }}
          title={`Max: ${max}${unit}`}
        />

        {/* IQR Box (Q1 to Q3) */}
        <div
          className="absolute h-10 bg-primary/20 border-2 border-primary rounded-xs top-1/2 -translate-y-1/2 transition-all shadow-xs"
          style={{
            left: `${posQ1}%`,
            width: `${Math.max(2, posQ3 - posQ1)}%`,
          }}
          title={`IQR: ${q1} to ${q3} (Span: ${(q3 - q1).toFixed(2)})`}
        />

        {/* Median Line */}
        <div
          className="absolute w-1 h-12 bg-primary top-1/2 -translate-y-1/2 z-10 rounded-full shadow-xs"
          style={{ left: `${posMed}%` }}
          title={`Median: ${median}${unit}`}
        />

        {/* Outlier dots */}
        {outlierPoints.map((pt, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-destructive border border-background top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
            style={{ left: `${getPos(pt)}%` }}
            title={`Outlier Observation: ${pt}${unit}`}
          />
        ))}
      </div>

      {/* Numerical Labels */}
      <div className="grid grid-cols-5 text-center text-xs font-mono text-muted-foreground pt-1 border-t border-border/40">
        <div>
          <span className="block text-[10px] text-muted-foreground/70 uppercase">Min</span>
          <span className="text-foreground font-medium">{min.toLocaleString()}{unit}</span>
        </div>
        <div>
          <span className="block text-[10px] text-muted-foreground/70 uppercase">Q1 (25%)</span>
          <span className="text-foreground font-medium">{q1.toLocaleString()}{unit}</span>
        </div>
        <div>
          <span className="block text-[10px] text-primary uppercase font-bold">Median</span>
          <span className="text-primary font-bold">{median.toLocaleString()}{unit}</span>
        </div>
        <div>
          <span className="block text-[10px] text-muted-foreground/70 uppercase">Q3 (75%)</span>
          <span className="text-foreground font-medium">{q3.toLocaleString()}{unit}</span>
        </div>
        <div>
          <span className="block text-[10px] text-muted-foreground/70 uppercase">Max</span>
          <span className="text-foreground font-medium">{max.toLocaleString()}{unit}</span>
        </div>
      </div>
    </div>
  );
};
