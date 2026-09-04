import { AnalysisRecord } from '../../types/analysis';
import fs from 'fs';
import path from 'path';

const ANALYSES_DIR = process.env.ANALYSES_DIR || (process.env.VERCEL ? path.join('/tmp', 'datalens_data', 'analyses') : path.join(process.cwd(), 'data', 'analyses'));

function ensureAnalysesDir(ownerId?: string) {
  try {
    const dir = ownerId ? path.join(ANALYSES_DIR, ownerId) : ANALYSES_DIR;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn('[DataLens Analyses Persistence] Failed to create analyses dir:', err);
  }
}

const inMemoryAnalysisStore = new Map<string, AnalysisRecord>();

function loadAnalysesFromDisk() {
  try {
    if (!fs.existsSync(ANALYSES_DIR)) return;
    const owners = fs.readdirSync(ANALYSES_DIR, { withFileTypes: true });
    for (const owner of owners) {
      if (owner.isDirectory()) {
        const ownerId = owner.name;
        const ownerDir = path.join(ANALYSES_DIR, ownerId);
        const files = fs.readdirSync(ownerDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const analysisId = file.replace('.json', '');
            const filePath = path.join(ownerDir, file);
            try {
              const raw = fs.readFileSync(filePath, 'utf-8');
              const record: AnalysisRecord = JSON.parse(raw);
              inMemoryAnalysisStore.set(analysisId, record);
            } catch (err) {
              console.error(`[DataLens Analyses] Failed to load analysis ${analysisId}:`, err);
            }
          }
        }
      }
    }
    console.log(`[DataLens Analyses Persistence] Loaded ${inMemoryAnalysisStore.size} persistent analysis record(s) from disk.`);
  } catch (err) {
    console.error('[DataLens Analyses Persistence] Error loading analyses from disk:', err);
  }
}

// Load persisted analyses on startup
loadAnalysesFromDisk();

function saveAnalysisToDisk(ownerId: string, analysis: AnalysisRecord) {
  try {
    ensureAnalysesDir(ownerId);
    const ownerDir = path.join(ANALYSES_DIR, ownerId);
    const filePath = path.join(ownerDir, `${analysis.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(analysis, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[DataLens Analyses Persistence] Failed to save analysis ${analysis.id} to disk:`, err);
  }
}

export function saveUserAnalysis(ownerId: string, analysis: AnalysisRecord): AnalysisRecord {
  if (!ownerId) {
    throw new Error('Owner ID is required to persist an analysis.');
  }

  const record: AnalysisRecord = {
    ...analysis,
    ownerId,
    insightsCount:
      typeof analysis.insightsCount === 'number'
        ? analysis.insightsCount
        : (analysis.keyFindings && analysis.keyFindings.length > 0)
        ? analysis.keyFindings.length
        : 1,
    status: analysis.status || 'completed',
    createdAt: analysis.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryAnalysisStore.set(record.id, record);
  saveAnalysisToDisk(ownerId, record);
  return record;
}

export function listUserAnalyses(ownerId: string, datasetId?: string): AnalysisRecord[] {
  if (!ownerId) return [];

  const list: AnalysisRecord[] = [];
  for (const item of inMemoryAnalysisStore.values()) {
    if (item.ownerId === ownerId && item.status === 'completed') {
      if (!datasetId || item.datasetId === datasetId) {
        list.push(item);
      }
    }
  }

  // Sort by createdAt descending
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getUserAnalysis(ownerId: string, analysisId: string): AnalysisRecord | null {
  if (!ownerId || !analysisId) return null;
  const item = inMemoryAnalysisStore.get(analysisId);
  if (item && item.ownerId === ownerId) {
    return item;
  }
  return null;
}

export function getUserAnalysesMetrics(
  ownerId: string,
  datasetId?: string | null
): { analysisCount: number; insightCount: number } {
  if (!ownerId || !datasetId) {
    return { analysisCount: 0, insightCount: 0 };
  }

  const analyses = listUserAnalyses(ownerId, datasetId);
  const analysisCount = analyses.length;
  const insightCount = analyses.reduce((sum, a) => {
    const verifiedFindings = a.keyFindings && a.keyFindings.length > 0 ? a.keyFindings.length : 1;
    const count =
      typeof a.insightsCount === 'number' && a.insightsCount > 0 ? a.insightsCount : verifiedFindings;
    return sum + count;
  }, 0);

  return { analysisCount, insightCount };
}

export function deleteUserAnalysis(ownerId: string, analysisId: string): boolean {
  if (!ownerId || !analysisId) return false;
  const item = inMemoryAnalysisStore.get(analysisId);
  if (item && item.ownerId === ownerId) {
    inMemoryAnalysisStore.delete(analysisId);
    try {
      const filePath = path.join(ANALYSES_DIR, ownerId, `${analysisId}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`[DataLens Analyses Persistence] Failed to delete analysis file:`, err);
    }
    return true;
  }
  return false;
}

export function clearUserAnalyses(ownerId?: string): void {
  if (ownerId) {
    for (const [id, item] of inMemoryAnalysisStore.entries()) {
      if (item.ownerId === ownerId) {
        inMemoryAnalysisStore.delete(id);
      }
    }
  } else {
    inMemoryAnalysisStore.clear();
  }
}
