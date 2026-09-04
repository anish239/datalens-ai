export interface AiEvidenceItem {
  metric: string;
  value: string | number;
  sourceTool: string;
  column?: string;
  details?: string;
}

export interface AiVisualizationSpec {
  recommended: boolean;
  type: 'bar' | 'line' | 'scatter' | 'histogram' | 'boxplot' | 'heatmap';
  title: string;
  xAxis?: string;
  yAxis?: string;
  aggregation?: string;
  data?: Record<string, any>[];
  description?: string;
}

export interface AiToolTraceItem {
  toolName: string;
  parameters: Record<string, any>;
  executionTimeMs: number;
  status: 'success' | 'error';
  summary: string;
  error?: string;
}

export interface AiAnalystResponse {
  conversationId: string;
  messageId: string;
  datasetId: string;
  answer: string;
  findings?: string[];
  keyFindings: string[];
  statistics?: Record<string, any>;
  tables?: any[];
  charts?: any[];
  recommendations?: string[];
  evidence: AiEvidenceItem[];
  methodology: string;
  caveats: string[];
  limitations: string[];
  visualization: AiVisualizationSpec | null;
  followUpQuestions: string[];
  dataSource?: {
    datasetId: string;
    filename: string;
    rows: number;
    columns: number;
  };
  execution?: {
    provider: 'gemini' | 'deterministic' | 'hybrid';
    toolsUsed: string[];
    status: string;
    fallbackNotice?: string;
    geminiStatus?: string;
  };
  toolTrace: AiToolTraceItem[];
  createdAt: string;
}

export interface AiAnalystRequest {
  datasetId: string;
  message: string;
  conversationId?: string;
  activeContext?: {
    selectedColumn?: string;
    activeTab?: string;
  };
}

export interface AiConversation {
  id: string;
  ownerId: string;
  datasetId: string;
  datasetName: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  ownerId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  structuredResponse?: AiAnalystResponse;
  toolTrace?: AiToolTraceItem[];
}

export type AiExecutionStep =
  | 'idle'
  | 'understanding'
  | 'planning'
  | 'executing_tool'
  | 'interpreting'
  | 'verifying'
  | 'complete'
  | 'error';
