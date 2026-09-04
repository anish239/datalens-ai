import React from 'react';
import { Terminal, CheckCircle, AlertTriangle, Clock, X, Code2 } from 'lucide-react';
import { AiToolTraceItem } from '../../types/ai';

interface AiAnalystToolTraceModalProps {
  traces: AiToolTraceItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function AiAnalystToolTraceModal({
  traces,
  isOpen,
  onClose,
}: AiAnalystToolTraceModalProps) {
  if (!isOpen) return null;

  const totalTimeMs = traces.reduce((acc, t) => acc + (t.executionTimeMs || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Deterministic Tool Execution Trace
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {traces.length} tool {traces.length === 1 ? 'call' : 'calls'} executed in {totalTimeMs}ms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 font-mono text-xs">
          {traces.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No tool traces recorded.</div>
          ) : (
            traces.map((trace, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      Step #{idx + 1}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                      {trace.toolName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3" />
                      {trace.executionTimeMs}ms
                    </span>
                    {trace.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold">
                        <CheckCircle className="w-3 h-3" /> SUCCESS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold">
                        <AlertTriangle className="w-3 h-3" /> ERROR
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] font-sans text-slate-600 dark:text-slate-300">
                  {trace.summary}
                </div>

                {trace.parameters && Object.keys(trace.parameters).length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px]">
                    <span className="text-slate-400 font-semibold">Parameters:</span>
                    <pre className="mt-1 p-2 rounded bg-slate-900 text-emerald-400 overflow-x-auto text-[10px] leading-relaxed">
                      {JSON.stringify(trace.parameters, null, 2)}
                    </pre>
                  </div>
                )}

                {trace.error && (
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-sans">
                    Error details: {trace.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <span>Security: Model only invokes predefined allowlisted functions.</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700"
          >
            Close Trace
          </button>
        </div>
      </div>
    </div>
  );
}
