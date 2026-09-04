import { auth } from './firebase';
import { ApiError } from './api';
import { AiAnalystRequest, AiAnalystResponse } from '../types/ai';
import { DatasetProfile } from '../types/dataset';
import {
  saveAiConversation,
  saveAiMessage,
  saveAnalysisRecord,
  ensureAuthenticatedUser,
} from './firestore';
import { AnalysisRecord } from '../types/analysis';

const API_BASE_URL = '/api';

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = await ensureAuthenticatedUser();
  if (!user) {
    throw new ApiError('UNAUTHENTICATED', 'You must be signed in to consult the AI Analyst.');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function askAiAnalyst(
  request: AiAnalystRequest,
  profile?: DatasetProfile
): Promise<AiAnalystResponse> {
  const headers = await getAuthHeaders();
  const user = await ensureAuthenticatedUser();

  const payload: any = {
    dataset_id: request.datasetId,
    message: request.message,
    conversation_id: request.conversationId,
    profile: profile || null,
  };

  const response = await fetch(`${API_BASE_URL}/ai/analyze`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = data.error || {
      code: 'AI_ERROR',
      message: 'Failed to complete AI analytical reasoning.',
    };
    throw new ApiError(err.code, err.message, err.details);
  }

  const result = data as AiAnalystResponse;

  // Persist conversation & messages securely to Firestore with authenticated UID
  const effectiveUid = user?.uid || profile?.ownerId;
  if (effectiveUid) {
    const datasetId = profile?.datasetId || request.datasetId;
    const fileName = profile?.fileName || 'Dataset';
    const convTitle = request.message.length > 40 ? `${request.message.substring(0, 37)}...` : request.message;
    
    // Save conversation doc
    await saveAiConversation(result.conversationId, effectiveUid, datasetId, fileName, convTitle).catch(() => {});
    
    // Save user message
    const userMsgId = `user_${Date.now()}`;
    await saveAiMessage(result.conversationId, userMsgId, effectiveUid, {
      role: 'user',
      content: request.message,
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    // Save assistant response (both Gemini and deterministic fallback)
    await saveAiMessage(result.conversationId, result.messageId, effectiveUid, {
      role: 'assistant',
      content: result.answer,
      structuredResponse: result,
      toolTrace: result.toolTrace,
      createdAt: result.createdAt || new Date().toISOString(),
    }).catch(() => {});

    // Save canonical AnalysisRecord to analyses/{analysisId}
    const verifiedFindingsCount =
      result.keyFindings && result.keyFindings.length > 0
        ? result.keyFindings.length
        : 1;

    const analysisRecord: AnalysisRecord = {
      id: `analysis_${result.messageId}`,
      ownerId: effectiveUid,
      datasetId,
      datasetName: fileName,
      conversationId: result.conversationId,
      messageId: result.messageId,
      query: request.message,
      answer: result.answer,
      keyFindings: result.keyFindings || [],
      insightsCount: verifiedFindingsCount,
      evidence: result.evidence || [],
      methodology: result.methodology || '',
      status: 'completed',
      createdAt: result.createdAt || new Date().toISOString(),
    };

    await saveAnalysisRecord(analysisRecord).catch((err) => {
      console.warn('[DataLens] Failed to persist canonical analysis record to Firestore:', err);
    });
  }

  return result;
}
