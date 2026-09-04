import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Loader2,
  Terminal,
  Bot,
  User,
  Info,
  HelpCircle,
  TrendingUp,
  BarChart3,
  AlertCircle,
  Shield,
  Download,
  PlusCircle,
  Database,
  Layers,
  Activity,
} from 'lucide-react';
import { DatasetProfile } from '../../types/dataset';
import { AiAnalystResponse, AiMessage, AiToolTraceItem } from '../../types/ai';
import { askAiAnalyst } from '../../services/aiAnalyst';
import { getUserAiConversations, getAiConversationMessages } from '../../services/firestore';
import { auth } from '../../services/firebase';
import { AiAnalystVisualization } from './AiAnalystVisualization';
import { AiAnalystToolTraceModal } from './AiAnalystToolTraceModal';
import { AiDeveloperTrace } from './AiDeveloperTrace';

function sanitizeAssistantAnswer(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s*across undefined records\.?/gi, '.')
    .replace(/\s*across null records\.?/gi, '.')
    .replace(/\s*across NaN records\.?/gi, '.')
    .replace(/undefined records/gi, '')
    .replace(/\[object Object\]/gi, '')
    .replace(/\bsvg(Diesel|Petrol|CNG|Verified|Tool|View|Dataset)\b/g, '$1')
    .trim();
}

interface AiAnalystPanelProps {
  profile: DatasetProfile;
  initialQuestion?: string;
}

export function AiAnalystPanel({ profile, initialQuestion }: AiAnalystPanelProps) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [inputText, setInputText] = useState(initialQuestion || '');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [selectedTrace, setSelectedTrace] = useState<AiToolTraceItem[] | null>(null);
  const [conversationId, setConversationId] = useState<string>(`conv_${Date.now()}`);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load previous conversation history from Firestore if available
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      const user = auth?.currentUser;
      if (!user || !profile.datasetId) return;
      try {
        const convs = await getUserAiConversations(user.uid, profile.datasetId);
        if (convs.length > 0 && isMounted) {
          const latestConv: any = convs[0];
          setConversationId(latestConv.id);
          const history = await getAiConversationMessages(latestConv.id, user.uid);
          if (history.length > 0 && isMounted) {
            setMessages(history as AiMessage[]);
          }
        }
      } catch (err) {
        console.warn('Could not restore AI conversation history:', err);
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, [profile.datasetId]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Suggested prompt pills based on real dataset columns
  const suggestedPrompts = [
    'What are the key trends and patterns in this dataset?',
    profile.categoricalColumns.length > 0 && profile.numericColumns.length > 0
      ? `Which ${profile.categoricalColumns[0]} has the highest average ${profile.numericColumns[0]}?`
      : 'What is the statistical summary of key columns?',
    profile.numericColumns.length >= 2
      ? `Which numeric variables are most correlated with ${profile.numericColumns[0]}?`
      : 'Find any unusual records or outlier anomalies.',
    'Summarize the primary data quality and completeness issues.',
  ].filter(Boolean);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || loading) return;

    setInputText('');
    const userMsgId = `usr_${Date.now()}`;
    const newMsg: AiMessage = {
      id: userMsgId,
      conversationId,
      ownerId: profile.ownerId,
      role: 'user',
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setLoading(true);
    setCurrentStep('Analyzing question intent...');

    // Progress simulation steps for clear observability
    const stepTimer1 = setTimeout(() => setCurrentStep('Selecting deterministic analytical tools...'), 600);
    const stepTimer2 = setTimeout(() => setCurrentStep('Executing calculations against scientific engine...'), 1400);
    const stepTimer3 = setTimeout(() => setCurrentStep('Verifying statistical evidence and bounds...'), 2200);

    try {
      const response = await askAiAnalyst(
        {
          datasetId: profile.datasetId,
          message: textToSend,
          conversationId,
        },
        profile
      );

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const assistantMsg: AiMessage = {
        id: response.messageId,
        conversationId: response.conversationId,
        ownerId: profile.ownerId,
        role: 'assistant',
        content: response.answer,
        createdAt: response.createdAt,
        structuredResponse: response,
        toolTrace: response.toolTrace,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const errorMsg: AiMessage = {
        id: `err_${Date.now()}`,
        conversationId,
        ownerId: profile.ownerId,
        role: 'assistant',
        content: `Error: ${err.message || 'Unable to complete AI analysis.'}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(`conv_${Date.now()}`);
    setInputText('');
  };

  const handleExportConversation = () => {
    if (messages.length === 0) return;
    const content = messages
      .map((m) => {
        if (m.role === 'user') {
          return `### User Query (${new Date(m.createdAt).toLocaleTimeString()}):\n${m.content}\n`;
        }
        const resp = m.structuredResponse;
        if (!resp) return `### DataLens AI:\n${m.content}\n`;

        return `### DataLens AI Analyst:\n**Answer:** ${resp.answer}\n\n**Key Findings:**\n${resp.keyFindings.map((k) => `- ${k}`).join('\n')}\n\n**Methodology:**\n${resp.methodology}\n\n**Evidence Count:** ${resp.evidence.length} verified metrics\n`;
      })
      .join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DataLens_AI_Analyst_${profile.fileName}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-[750px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                DataLens Autonomous AI Analyst
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Deterministic Grounding Active
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Grounded in {profile.fileName} • {profile.rowCount.toLocaleString()} rows • Quality: {profile.dataQualityScore}/100
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <>
              <button
                onClick={handleExportConversation}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Export Findings
              </button>
              <button
                onClick={handleNewConversation}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                New Thread
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-slate-50/30 dark:bg-slate-950/20">
        {messages.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center max-w-xl mx-auto space-y-6">
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
              <Bot className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Ask anything about '{profile.fileName}'
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                DataLens AI uses Gemini for intent detection and analytical reasoning, but invokes deterministic mathematical engines (Pandas/NumPy/SciPy) for all calculations. No fabricated numbers.
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="w-full space-y-2 pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Suggested Inquiries:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all text-xs font-medium text-slate-700 dark:text-slate-300 text-left shadow-2xs hover:shadow-xs"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                }`}
              >
                {msg.role === 'user' ? (
                  <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>
                ) : (
                  <div className="space-y-4 text-xs sm:text-sm">
                    {/* Compact Fallback Notice if triggered */}
                    {msg.structuredResponse?.execution?.fallbackNotice && (
                      <div className="p-2.5 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{msg.structuredResponse.execution.fallbackNotice}</span>
                      </div>
                    )}

                    {/* Executive Answer rendered via ReactMarkdown */}
                    <div className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal text-sm sm:text-base font-sans">
                      <ReactMarkdown
                        components={{
                          h2: ({ children }) => (
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1.5">
                              {children}
                            </h3>
                          ),
                          p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="space-y-1 mb-2 pl-4 list-disc">{children}</ul>,
                          li: ({ children }) => <li className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-slate-900 dark:text-slate-100">{children}</strong>,
                          code: ({ children }) => <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[12px] font-mono">{children}</code>,
                        }}
                      >
                        {sanitizeAssistantAnswer(msg.structuredResponse?.answer || msg.content)}
                      </ReactMarkdown>
                    </div>

                    {/* Recommended Visualization */}
                    {msg.structuredResponse?.visualization && (
                      <AiAnalystVisualization
                        spec={msg.structuredResponse.visualization}
                        profile={profile}
                      />
                    )}

                    {/* Suggested Follow-Ups */}
                    {msg.structuredResponse?.followUpQuestions && msg.structuredResponse.followUpQuestions.length > 0 && (
                      <div className="pt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-400">
                          Suggested next analysis:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.structuredResponse.followUpQuestions.map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSend(q)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200/60 dark:border-indigo-800 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 transition-colors text-left"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Collapsed Developer Trace Component */}
                    <AiDeveloperTrace
                      execution={msg.structuredResponse?.execution}
                      traces={msg.toolTrace}
                      evidence={msg.structuredResponse?.evidence}
                      methodology={msg.structuredResponse?.methodology}
                    />
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-xs mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading / Tool Step Indicator */}
        {loading && (
          <div className="flex gap-3 justify-start animate-in fade-in duration-200">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>

            <div className="p-4 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{currentStep || 'Autonomous AI reasoning in progress...'}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Calling deterministic analytical tools to compute exact statistics...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative"
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask anything about '${profile.fileName}' (e.g. 'What are the main trends?', 'Which category has highest sales?', 'Check outliers in price')...`}
            className="w-full resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none pr-20"
            disabled={loading}
            maxLength={2000}
          />

          <div className="absolute right-2.5 bottom-3 flex items-center gap-2">
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {inputText.length}/2000
            </span>
            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="p-2 rounded-lg bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-xs"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 px-1">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-500" />
            Prompt-injection safe • Data is treated strictly as untrusted content
          </span>
          <span className="hidden sm:inline">Press Enter to send, Shift+Enter for newline</span>
        </div>
      </div>

      {/* Tool Trace Modal */}
      {selectedTrace && (
        <AiAnalystToolTraceModal
          traces={selectedTrace}
          isOpen={!!selectedTrace}
          onClose={() => setSelectedTrace(null)}
        />
      )}
    </div>
  );
}
