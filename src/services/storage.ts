import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];
export const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/octet-stream',
  '',
];

const DISALLOWED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-sh',
  'application/x-executable',
  'application/x-dosexec',
  'text/html',
  'text/javascript',
  'application/javascript',
  'application/x-php',
  'application/x-httpd-php',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  fileType?: 'csv' | 'xlsx';
}

/**
 * Sanitizes a filename to prevent directory traversal, hidden files, or malformed storage keys.
 */
export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== 'string') {
    return `dataset_${Date.now()}.csv`;
  }

  let clean = name;
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // Keep raw string if URI decoding fails
  }

  // Remove any directory paths (both forward and backward slashes)
  clean = clean.replace(/^.*[/\\]/, '');

  // Extract extension if valid
  const lastDotIndex = clean.lastIndexOf('.');
  let ext = lastDotIndex !== -1 ? clean.substring(lastDotIndex).toLowerCase() : '';
  let baseName = lastDotIndex !== -1 ? clean.substring(0, lastDotIndex) : clean;

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    ext = ext.endsWith('xlsx') ? '.xlsx' : ext.endsWith('xls') ? '.xls' : '.csv';
  }

  // Clean base name: replace unsafe characters and multiple dots
  baseName = baseName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
    .replace(/\.{2,}/g, '.')
    .trim();

  if (!baseName || baseName.length === 0) {
    baseName = `dataset_${Date.now()}`;
  }

  // Cap filename length to 100 characters
  baseName = baseName.substring(0, 100);

  return `${baseName}${ext}`;
}

/**
 * Validates untrusted file inputs for extension, mime type, and file size limits.
 */
export function validateDatasetFile(file: File): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (typeof file.size !== 'number' || file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${((file.size || 0) / (1024 * 1024)).toFixed(1)} MB) exceeds the 50 MB limit.`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty (0 bytes). Please upload a dataset with valid records.',
    };
  }

  const fileName = (file.name || '').toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: 'Unsupported file format. DataLens AI currently supports CSV (.csv) and Excel (.xlsx) files.',
    };
  }

  // Check for dangerous MIME types
  const mimeType = (file.type || '').toLowerCase();
  if (DISALLOWED_MIME_TYPES.some(disallowed => mimeType.includes(disallowed))) {
    return {
      valid: false,
      error: 'Disallowed file MIME type detected for security reasons.',
    };
  }

  const fileType: 'csv' | 'xlsx' = fileName.endsWith('.csv') ? 'csv' : 'xlsx';
  const sanitizedName = sanitizeFileName(file.name);

  return {
    valid: true,
    sanitizedName,
    fileType,
  };
}

/**
 * Constructs the secure per-user storage path: users/{uid}/datasets/{datasetId}/{fileName}
 */
export function getStoragePath(uid: string, datasetId: string, fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  return `users/${uid}/datasets/${datasetId}/${sanitized}`;
}

/**
 * Uploads a validated dataset file to user's isolated storage directory.
 * (Deferred in Phase 1 due to Firebase Storage project plan requirements)
 */
export async function uploadDatasetFile(
  uid: string,
  datasetId: string,
  file: File,
  _onProgress?: (percent: number) => void
): Promise<{ storagePath: string; downloadUrl: string }> {
  const validation = validateDatasetFile(file);
  if (!validation.valid || !validation.sanitizedName) {
    throw new Error(validation.error || 'Invalid file.');
  }

  if (!storage) {
    throw new Error(
      'Firebase Storage is currently deferred for Phase 1 because the project plan does not provide active Storage capabilities. Dataset ingestion will be connected in a future phase.'
    );
  }

  const storagePath = getStoragePath(uid, datasetId, validation.sanitizedName);
  const storageReference = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageReference, file, {
    contentType: file.type || (validation.fileType === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
    customMetadata: {
      ownerId: uid,
      originalName: file.name,
      uploadedAt: new Date().toISOString(),
    },
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (_onProgress) _onProgress(progress);
      },
      error => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ storagePath, downloadUrl });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * Deletes a file from storage.
 */
export async function deleteStorageFile(storagePath: string): Promise<void> {
  if (!storage) {
    throw new Error('Firebase Storage is currently deferred for Phase 1.');
  }
  const storageReference = ref(storage, storagePath);
  await deleteObject(storageReference);
}
