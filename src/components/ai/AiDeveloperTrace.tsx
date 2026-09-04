import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Terminal, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import { AiEvidenceItem, AiToolTraceItem } from '../../types/ai';

interface AiDeveloperTraceProps {
  execution?: {
    provider?: 'gemini' | 'deterministic' | 'hybrid';
    toolsUsed?: string[];
    status?: string;
    fallbackNotice?: string;
    geminiStatus?: string;
  };
  traces?: AiToolTraceItem[];
  evidence?: AiEvidenceItem[];
  methodology?: string;
}

export function AiDeveloperTrace({
  execution,
  traces = [],
  evidence = [],
  methodology,
}: AiDeveloperTraceProps) {
  const [isOpen, setIsOpen] = useState(false);

  // If there is no execution metadata and no traces, don't show the toggle
  if (!execution && traces.length === 0 && evidence.length === 0) {
    return null;
  }

  return (
    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-mono transition-colors"
      >
        <span>Developer Trace</span>
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs space-y-3 font-mono">
          {/* Metadata Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">Provider</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {execution?.provider || 'deterministic'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Status</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {execution?.status || 'success'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Tools Used</span>
              <span className="text-slate-700 dark:text-slate-300">
                {execution?.toolsUsed?.join(', ') || traces.map((t) => t.toolName).join(', ') || 'N/A'}
              </span>
            </div>
          </div>

          {/* Methodology if available */}
          {methodology && (
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              <span className="text-slate-400 block text-[10px]">Methodology:</span>
              <p className="font-sans mt-0.5">{methodology}</p>
            </div>
          )}

          {/* Tool Traces */}
          {traces.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Tool Execution ({traces.length})
              </span>
              {traces.map((t, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Terminal className="w-3 h-3" />
                      {t.toolName}
                    </span>
                    <span className="text-slate-400 font-normal">
                      {t.executionTimeMs}ms
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-sans text-[11px]">
                    {t.summary}
                  </p>
                  {t.parameters && Object.keys(t.parameters).length > 0 && (
                    <details className="text-[10px] text-slate-500 pt-1">
                      <summary className="cursor-pointer hover:underline">Parameters</summary>
                      <pre className="mt-1 p-1.5 rounded bg-slate-100 dark:bg-slate-950 overflow-x-auto">
                        {JSON.stringify(t.parameters, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Evidence Details */}
          {evidence.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Numerical Evidence Records ({evidence.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {evidence.map((ev, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-slate-300 font-sans truncate">
                        {ev.metric}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 ml-2 shrink-0">
                        {typeof ev.value === 'number' ? ev.value.toLocaleString() : ev.value}
                      </span>
                    </div>
                    {ev.details && (
                      <span className="text-[10px] text-slate-400 font-sans block mt-0.5 truncate">
                        {ev.details}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
