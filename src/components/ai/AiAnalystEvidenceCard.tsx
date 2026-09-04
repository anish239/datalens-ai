import React from 'react';
import { CheckCircle2, Calculator, Database, ShieldCheck } from 'lucide-react';
import { AiEvidenceItem } from '../../types/ai';

interface AiAnalystEvidenceCardProps {
  evidence: AiEvidenceItem[];
}

export function AiAnalystEvidenceCard({ evidence }: AiAnalystEvidenceCardProps) {
  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
            Statistical Evidence ({evidence.length})
          </span>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300">
          Deterministic Analytics Engine
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {evidence.map((ev, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 shadow-xs space-y-1"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                {ev.metric}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {typeof ev.value === 'number' ? ev.value.toLocaleString() : ev.value}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calculator className="w-3 h-3 text-slate-400" />
                Tool: <code className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-1 rounded">{ev.sourceTool}</code>
              </span>
              {ev.column && (
                <span className="flex items-center gap-1 truncate max-w-[110px]">
                  <Database className="w-2.5 h-2.5 text-slate-400" />
                  {ev.column}
                </span>
              )}
            </div>

            {ev.details && (
              <p className="text-[10px] text-slate-600 dark:text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-800 line-clamp-2">
                {ev.details}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
