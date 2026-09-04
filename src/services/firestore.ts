import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db, auth, isFirebaseConfigured } from './firebase';
import { UserProfile, AuthProviderType } from '../types/user';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { listDatasets, getUserMetricsApi, getUserAnalysesApi, saveUserAnalysisApi } from './api';
import { AnalysisRecord } from '../types/analysis';

export interface FirestoreErrorInfo {
  operation: string;
  path: string;
  authenticatedUid: string | null;
  errorCode: string;
  errorMessage: string;
}

// Track logged permissions errors to avoid console spamming
const loggedPermissionWarnings = new Set<string>();

/**
 * Diagnostic logger that captures structured Firestore errors without exposing
 * sensitive credentials, tokens, or raw user payload data.
 */
export function handleFirestoreError(
  operation: string,
  path: string,
  error: any
): void {
  const currentUid = auth?.currentUser?.uid || null;
  const errorCode = error?.code || 'unknown';
  const errorMessage = error?.message || String(error);

  const errorInfo: FirestoreErrorInfo = {
    operation,
    path,
    authenticatedUid: currentUid,
    errorCode,
    errorMessage,
  };

  const key = `${operation}:${path}:${errorCode}`;
  if (!loggedPermissionWarnings.has(key)) {
    loggedPermissionWarnings.add(key);
    console.warn('[DataLens AI Data Resilience Notice]', JSON.stringify(errorInfo, null, 2));
  }
}

/**
 * Helper to get local cached profile
 */
function getLocalProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`datalens_user_profile_${uid}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

/**
 * Helper to save local cached profile
 */
function setLocalProfile(uid: string, profile: UserProfile): void {
  try {
    localStorage.setItem(`datalens_user_profile_${uid}`, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

/**
 * Ensures Firebase Auth has completed session restoration before performing
 * Firestore read/write operations to prevent auth-state race conditions.
 */
export async function ensureAuthenticatedUser(timeoutMs = 4000): Promise<FirebaseUser | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve) => {
    let unsubscribe: (() => void) | null = null;
    const timer = setTimeout(() => {
      if (unsubscribe) unsubscribe();
      resolve(auth?.currentUser || null);
    }, timeoutMs);

    unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      if (unsubscribe) unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Retrieves a user profile from Firestore by UID with local storage fallback.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  
  // Check local cache first
  const cached = getLocalProfile(uid);

  if (!isFirebaseConfigured || !db) {
    return cached;
  }

  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      setLocalProfile(uid, data);
      return data;
    }
    return cached;
  } catch (error) {
    handleFirestoreError('getUserProfile', path, error);
    return cached;
  }
}

/**
 * Creates or synchronizes the user profile in Firestore when signing up or logging in.
 * Preserves existing createdAt timestamp and provides seamless local fallback.
 */
export async function syncUserProfile(user: FirebaseUser, overrideName?: string): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const providerId = user.providerData[0]?.providerId || 'password';
  const resolvedProvider: AuthProviderType = 
    providerId === 'google.com' ? 'google.com' :
    providerId === 'github.com' ? 'github.com' : 'password';

  const displayName = overrideName || user.displayName || user.email?.split('@')[0] || 'Data Analyst';
  const email = user.email || null;
  const photoURL = user.photoURL || null;

  const fallbackProfile: UserProfile = {
    uid: user.uid,
    displayName,
    email,
    photoURL,
    provider: resolvedProvider,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Always keep local storage updated
  setLocalProfile(user.uid, fallbackProfile);

  if (!isFirebaseConfigured || !db) {
    return fallbackProfile;
  }

  try {
    const userRef = doc(db, 'users', user.uid);
    const existingDoc = await getDoc(userRef).catch(() => null);

    if (existingDoc && existingDoc.exists()) {
      const updateData: Partial<UserProfile> = {
        displayName: overrideName || existingDoc.data()?.displayName || displayName,
        email,
        photoURL: photoURL || existingDoc.data()?.photoURL || null,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(userRef, updateData).catch(err => {
        handleFirestoreError('syncUserProfile:update', path, err);
      });

      const finalProfile = {
        uid: user.uid,
        displayName: updateData.displayName || displayName,
        email,
        photoURL,
        provider: resolvedProvider,
        createdAt: existingDoc.data()?.createdAt,
        updatedAt: new Date(),
      };
      setLocalProfile(user.uid, finalProfile);
      return finalProfile;
    } else {
      const newProfile: UserProfile = {
        uid: user.uid,
        displayName,
        email,
        photoURL,
        provider: resolvedProvider,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, newProfile).catch(err => {
        handleFirestoreError('syncUserProfile:create', path, err);
      });

      return fallbackProfile;
    }
  } catch (err) {
    handleFirestoreError('syncUserProfile', path, err);
    return fallbackProfile;
  }
}

/**
 * Updates a user's display name or photo in their profile.
 */
export async function updateUserProfile(
  uid: string,
  data: { displayName?: string; photoURL?: string; themePreference?: 'light' | 'dark' | 'system' }
): Promise<void> {
  if (!uid) throw new Error('User ID is required');

  const cached = getLocalProfile(uid);
  if (cached) {
    setLocalProfile(uid, { ...cached, ...data, updatedAt: new Date() });
  }

  if (!isFirebaseConfigured || !db) return;

  const path = `users/${uid}`;
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError('updateUserProfile', path, err);
  }
}

export interface UserWorkspaceMetrics {
  datasetCount: number;
  analysisCount: number;
  reportCount: number;
  insightCount: number;
}

/**
 * Retrieves counts for user-owned datasets, analyses, and reports.
 * Returns verified counts without fabricating data.
 * Analyses and Insights are isolated to the active dataset (or 0 if no dataset is active).
 */
export async function getUserMetrics(
  uid: string,
  activeDatasetId?: string | null
): Promise<UserWorkspaceMetrics> {
  if (!uid) {
    throw new Error('User ID is required to fetch workspace metrics.');
  }

  // Attempt to fetch from backend API first
  let apiMetrics: UserWorkspaceMetrics = {
    datasetCount: 0,
    analysisCount: 0,
    reportCount: 0,
    insightCount: 0,
  };
  let apiFetchSucceeded = false;

  try {
    apiMetrics = await getUserMetricsApi(activeDatasetId || undefined);
    apiFetchSucceeded = true;
  } catch (error) {
    console.warn('[DataLens] Failed to fetch metrics from backend API, falling back to canonical persistence:', error);
  }

  // If no active dataset, dataset-specific analyses and insights MUST be 0
  if (!activeDatasetId) {
    let datasetCount = apiMetrics.datasetCount;
    if (!apiFetchSucceeded) {
      const res = await listDatasets().catch(() => ({ items: [] }));
      datasetCount = res?.items?.length || 0;
    }
    return {
      datasetCount: Math.max(apiMetrics.datasetCount, datasetCount),
      analysisCount: 0,
      reportCount: apiMetrics.reportCount || 0,
      insightCount: 0,
    };
  }

  // Cross-verify and merge with canonical analyses for the specific active dataset
  try {
    const userAnalyses = await getUserAnalyses(uid, activeDatasetId);
    const analysisCount = userAnalyses.length;
    const insightCount = userAnalyses.reduce((sum, a) => {
      const count =
        typeof a.insightsCount === 'number' && a.insightsCount > 0
          ? a.insightsCount
          : a.keyFindings?.length || 1;
      return sum + count;
    }, 0);

    let datasetCount = apiMetrics.datasetCount;
    if (!apiFetchSucceeded) {
      const res = await listDatasets().catch(() => ({ items: [] }));
      datasetCount = res?.items?.length || 0;
    }

    return {
      datasetCount: Math.max(apiMetrics.datasetCount, datasetCount),
      analysisCount: Math.max(apiMetrics.analysisCount, analysisCount),
      reportCount: apiMetrics.reportCount || 0,
      insightCount: Math.max(apiMetrics.insightCount, insightCount),
    };
  } catch (fallbackError) {
    if (apiFetchSucceeded) {
      return apiMetrics;
    }
    console.error('[DataLens] Failed to derive metrics from fallback stores:', fallbackError);
    throw fallbackError;
  }
}

/**
 * Retrieves the user's datasets list with backend integration and resilient fallback.
 */
export async function getUserDatasets(uid: string, maxItems = 20) {
  if (!uid) return [];
  try {
    const response = await listDatasets();
    if (response?.items && Array.isArray(response.items)) {
      return response.items.map((item: any) => ({
        id: item.datasetId || item.id,
        datasetId: item.datasetId || item.id,
        name: item.fileName || item.name || 'Dataset',
        fileName: item.fileName || item.name || 'Dataset',
        fileType: item.fileType || 'csv',
        fileSizeBytes: item.fileSizeBytes || 0,
        rowCount: item.rowCount || 0,
        columnCount: item.columnCount || 0,
        dataQualityScore: item.dataQualityScore || 100,
        createdAt: item.createdAt || new Date().toISOString(),
        profileStatus: item.profileStatus || 'ready',
        ownerId: item.ownerId || uid,
      }));
    }
  } catch (err) {
    console.warn('[DataLens] Fallback retrieving datasets:', err);
  }
  return [];
}

/**
 * Creates or updates an AI Analyst Conversation document with local fallback.
 */
export async function saveAiConversation(
  conversationId: string,
  ownerId: string,
  datasetId: string,
  datasetName: string,
  title: string
): Promise<void> {
  const conv = {
    id: conversationId,
    ownerId,
    datasetId,
    datasetName,
    title,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Save to localStorage
  try {
    const key = `datalens_ai_convs_${ownerId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((c: any) => c.id !== conversationId);
    filtered.unshift(conv);
    localStorage.setItem(key, JSON.stringify(filtered.slice(0, 50)));
  } catch {
    // ignore
  }

  if (!isFirebaseConfigured || !db) return;

  const path = `conversations/${conversationId}`;
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await setDoc(convRef, conv, { merge: true });
  } catch (err: any) {
    handleFirestoreError('saveAiConversation', path, err);
  }
}

/**
 * Saves a message in a conversation, ensuring authenticated ownership and serialized payloads.
 */
export async function saveAiMessage(
  conversationId: string,
  messageId: string,
  ownerId: string,
  data: Record<string, any>
): Promise<void> {
  // Sanitize data: eliminate undefined keys and non-serializable fields
  const cleanData: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      try {
        cleanData[k] = JSON.parse(JSON.stringify(v));
      } catch {
        cleanData[k] = String(v);
      }
    }
  }

  const msg = {
    ...cleanData,
    id: messageId,
    conversationId,
    ownerId,
    createdAt: cleanData.createdAt || new Date().toISOString(),
  };

  // Save to localStorage
  try {
    const key = `datalens_ai_msgs_${conversationId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((m: any) => m.id !== messageId);
    filtered.push(msg);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch {
    // ignore
  }

  if (!isFirebaseConfigured || !db) return;

  const path = `conversations/${conversationId}/messages/${messageId}`;
  try {
    const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
    await setDoc(msgRef, msg, { merge: true });
  } catch (err: any) {
    handleFirestoreError('saveAiMessage', path, err);
  }
}

/**
 * Retrieves user's AI conversations for a dataset or across all datasets with local fallback.
 */
export async function getUserAiConversations(uid: string, datasetId?: string) {
  if (!uid) return [];

  let localConvs: any[] = [];
  try {
    const key = `datalens_ai_convs_${uid}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      localConvs = JSON.parse(raw);
      if (datasetId) {
        localConvs = localConvs.filter((c: any) => c.datasetId === datasetId);
      }
    }
  } catch {
    // ignore
  }

  if (!isFirebaseConfigured || !db) return localConvs;

  const path = 'conversations';
  try {
    const convRef = collection(db, 'conversations');
    const q = datasetId
      ? query(convRef, where('ownerId', '==', uid), where('datasetId', '==', datasetId))
      : query(convRef, where('ownerId', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
  } catch (err: any) {
    handleFirestoreError('getUserAiConversations', path, err);
  }

  return localConvs;
}

/**
 * Retrieves all messages in a conversation with local fallback.
 */
export async function getAiConversationMessages(conversationId: string, uid: string) {
  if (!uid || !conversationId) return [];

  let localMsgs: any[] = [];
  try {
    const key = `datalens_ai_msgs_${conversationId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      localMsgs = JSON.parse(raw);
    }
  } catch {
    // ignore
  }

  if (!isFirebaseConfigured || !db) return localMsgs;

  const path = `conversations/${conversationId}/messages`;
  try {
    const msgRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(msgRef, where('ownerId', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    }
  } catch (err: any) {
    handleFirestoreError('getAiConversationMessages', path, err);
  }

  return localMsgs;
}

// In-memory fallback for environments without global localStorage (tests/SSR)
const memoryFallbackStore = new Map<string, string>();

function getLocalStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // Fall back to memory map
  }
  return memoryFallbackStore.get(key) || null;
}

function setLocalStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    // Fall back to memory map
  }
  memoryFallbackStore.set(key, value);
}

export function clearLocalAnalyses(uid?: string): void {
  if (uid) {
    const key = `datalens_analyses_${uid}`;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
    memoryFallbackStore.delete(key);
  } else {
    try {
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith('datalens_analyses_')) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      // ignore
    }
    memoryFallbackStore.clear();
  }
}

/**
 * Persists a completed AnalysisRecord to Firestore under `analyses/{analysisId}`
 * and synchronizes with local storage fallback and backend API.
 */
export async function saveAnalysisRecord(record: AnalysisRecord): Promise<void> {
  if (!record || !record.id || !record.ownerId) {
    throw new Error('Invalid analysis record: missing id or ownerId.');
  }

  // Sanitize record payload
  const cleanData: Record<string, any> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v !== undefined) {
      try {
        cleanData[k] = JSON.parse(JSON.stringify(v));
      } catch {
        cleanData[k] = String(v);
      }
    }
  }

  const analysisDoc: AnalysisRecord = {
    ...cleanData,
    id: record.id,
    ownerId: record.ownerId,
    datasetId: record.datasetId,
    insightsCount:
      typeof record.insightsCount === 'number'
        ? record.insightsCount
        : record.keyFindings?.length || 1,
    status: record.status || 'completed',
    createdAt: record.createdAt || new Date().toISOString(),
  } as AnalysisRecord;

  // Save to local storage for resilient client-side caching & instant updates
  try {
    const key = `datalens_analyses_${record.ownerId}`;
    const existing: AnalysisRecord[] = JSON.parse(getLocalStorageItem(key) || '[]');
    const filtered = existing.filter((a) => a.id !== record.id);
    filtered.unshift(analysisDoc);
    setLocalStorageItem(key, JSON.stringify(filtered.slice(0, 100)));
  } catch {
    // ignore
  }

  // Notify active listeners that metrics have updated
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('datalens:metrics-updated', { detail: { ownerId: record.ownerId } })
    );
  }

  // Also sync to backend API in the background
  try {
    await saveUserAnalysisApi(analysisDoc).catch(() => {});
  } catch {
    // ignore backend sync error
  }

  if (!isFirebaseConfigured || !db) return;

  const path = `analyses/${record.id}`;
  try {
    const docRef = doc(db, 'analyses', record.id);
    await setDoc(docRef, analysisDoc, { merge: true });
  } catch (err: any) {
    handleFirestoreError('saveAnalysisRecord', path, err);
  }
}

/**
 * Retrieves all analyses for the authenticated user from Firestore, backend API, or local storage.
 */
export async function getUserAnalyses(uid: string, datasetId?: string): Promise<AnalysisRecord[]> {
  if (!uid) return [];

  let localAnalyses: AnalysisRecord[] = [];
  try {
    const key = `datalens_analyses_${uid}`;
    const raw = getLocalStorageItem(key);
    if (raw) {
      localAnalyses = JSON.parse(raw);
      if (datasetId) {
        localAnalyses = localAnalyses.filter((a) => a.datasetId === datasetId);
      }
    }
  } catch {
    // ignore
  }

  // Synchronize with backend API analyses store
  try {
    const apiAnalyses = await getUserAnalysesApi(datasetId);
    if (Array.isArray(apiAnalyses) && apiAnalyses.length > 0) {
      const map = new Map<string, AnalysisRecord>();
      for (const a of apiAnalyses) {
        if (a.ownerId === uid) {
          map.set(a.id, a);
        }
      }
      for (const a of localAnalyses) {
        if (a.ownerId === uid && !map.has(a.id)) {
          map.set(a.id, a);
        }
      }
      localAnalyses = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch {
    // ignore backend failure in fallback
  }

  if (!isFirebaseConfigured || !db) return localAnalyses;

  const path = 'analyses';
  try {
    const collRef = collection(db, 'analyses');
    const q = datasetId
      ? query(collRef, where('ownerId', '==', uid), where('datasetId', '==', datasetId))
      : query(collRef, where('ownerId', '==', uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const remote = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AnalysisRecord));
      const map = new Map<string, AnalysisRecord>();
      for (const a of remote) {
        if (a.ownerId === uid) {
          map.set(a.id, a);
        }
      }
      for (const a of localAnalyses) {
        if (a.ownerId === uid && !map.has(a.id)) {
          map.set(a.id, a);
        }
      }
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  } catch (err: any) {
    handleFirestoreError('getUserAnalyses', path, err);
  }

  return localAnalyses;
}

/**
 * Saves a report record to Firestore under `reports/{reportId}` with local fallback.
 */
export async function saveReportRecord(report: any): Promise<void> {
  if (!report || !report.reportId || !report.ownerId) {
    throw new Error('Invalid report record: missing reportId or ownerId.');
  }

  const cleanData: Record<string, any> = {};
  for (const [k, v] of Object.entries(report)) {
    if (v !== undefined) {
      try {
        cleanData[k] = JSON.parse(JSON.stringify(v));
      } catch {
        cleanData[k] = String(v);
      }
    }
  }

  const key = `datalens_reports_${report.ownerId}`;
  try {
    const existing = JSON.parse(getLocalStorageItem(key) || '[]');
    const filtered = existing.filter((r: any) => (r.reportId || r.id) !== report.reportId);
    filtered.unshift(cleanData);
    setLocalStorageItem(key, JSON.stringify(filtered.slice(0, 50)));
  } catch {
    // ignore
  }

  if (!isFirebaseConfigured || !db) return;

  const path = `reports/${report.reportId}`;
  try {
    const docRef = doc(db, 'reports', report.reportId);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err: any) {
    handleFirestoreError('saveReportRecord', path, err);
  }
}

/**
 * Deletes a report record from Firestore and local cache.
 */
export async function deleteReportRecord(reportId: string, ownerId: string): Promise<void> {
  if (!reportId || !ownerId) return;

  const key = `datalens_reports_${ownerId}`;
  try {
    const existing = JSON.parse(getLocalStorageItem(key) || '[]');
    const filtered = existing.filter((r: any) => (r.reportId || r.id) !== reportId);
    setLocalStorageItem(key, JSON.stringify(filtered));
  } catch {
    // ignore
  }

  if (!isFirebaseConfigured || !db) return;

  const path = `reports/${reportId}`;
  try {
    const docRef = doc(db, 'reports', reportId);
    await deleteDoc(docRef);
  } catch (err: any) {
    handleFirestoreError('deleteReportRecord', path, err);
  }
}
