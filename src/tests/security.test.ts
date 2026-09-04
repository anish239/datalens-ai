import { describe, it, expect } from 'vitest';
import { sanitizeFileName, validateDatasetFile, getStoragePath } from '../services/storage';
import { mapAuthError } from '../services/auth';

describe('Storage & Dataset Security Validation', () => {
  describe('Path Traversal & Filename Sanitization', () => {
    it('strips directory traversal paths (../, ..\\)', () => {
      const malicious = '../../../../etc/passwd.csv';
      const sanitized = sanitizeFileName(malicious);
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('..');
      expect(sanitized).toBe('passwd.csv');
    });

    it('strips Windows path separators (..\\..\\windows\\system32.xlsx)', () => {
      const malicious = '..\\..\\windows\\system32\\config.xlsx';
      const sanitized = sanitizeFileName(malicious);
      expect(sanitized).not.toContain('\\');
      expect(sanitized).not.toContain('..');
      expect(sanitized).toBe('config.xlsx');
    });

    it('decodes and cleans URL-encoded path traversal sequences (%2e%2e%2f)', () => {
      const malicious = '%2e%2e%2f%2e%2e%2fdata.csv';
      const sanitized = sanitizeFileName(malicious);
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('..');
      expect(sanitized).toBe('data.csv');
    });

    it('handles filenames with invalid/dangerous characters and control bytes', () => {
      const unsafe = 'my_dataset*?!$<script>.csv';
      const sanitized = sanitizeFileName(unsafe);
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).not.toContain('*');
      expect(sanitized).toMatch(/^[a-zA-Z0-9_-]+\.csv$/);
    });

    it('provides a safe fallback name when the input has no valid characters', () => {
      const blank = '??????.csv';
      const sanitized = sanitizeFileName(blank);
      expect(sanitized).toMatch(/^dataset_\d+\.csv$/);
    });

    it('generates properly isolated per-user storage paths', () => {
      const uid = 'user_12345';
      const datasetId = 'ds_abc999';
      const filename = '../../secret_data.csv';
      const storagePath = getStoragePath(uid, datasetId, filename);
      expect(storagePath).toBe('users/user_12345/datasets/ds_abc999/secret_data.csv');
      expect(storagePath).not.toContain('..');
    });
  });

  describe('Dataset Upload File Validation', () => {
    it('accepts valid CSV files under 50MB', () => {
      const file = new File(['col1,col2\n1,2'], 'sales_data.csv', { type: 'text/csv' });
      const result = validateDatasetFile(file);
      expect(result.valid).toBe(true);
      expect(result.fileType).toBe('csv');
      expect(result.sanitizedName).toBe('sales_data.csv');
    });

    it('accepts valid Excel (.xlsx) files under 50MB', () => {
      const file = new File(['fake-binary-content'], 'financial_q3.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const result = validateDatasetFile(file);
      expect(result.valid).toBe(true);
      expect(result.fileType).toBe('xlsx');
    });

    it('rejects empty files (0 bytes)', () => {
      const file = new File([], 'empty.csv', { type: 'text/csv' });
      const result = validateDatasetFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty (0 bytes)');
    });

    it('rejects files exceeding the 50MB size limit', () => {
      const fakeLargeFile = {
        name: 'huge_dataset.csv',
        size: 55 * 1024 * 1024,
        type: 'text/csv',
      } as File;
      const result = validateDatasetFile(fakeLargeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds the 50 MB limit');
    });

    it('rejects disallowed file extensions (.exe, .sh, .py, .js, .pdf)', () => {
      const scriptFile = new File(['alert(1)'], 'exploit.js', { type: 'application/javascript' });
      const result = validateDatasetFile(scriptFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });

    it('rejects dangerous MIME types', () => {
      const dangerousFile = new File(['binary'], 'disguised.csv', {
        type: 'application/x-msdownload',
      });
      const result = validateDatasetFile(dangerousFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disallowed file MIME type');
    });
  });
});

describe('Authentication & Security Error Mapping', () => {
  it('maps invalid credential error to safe message', () => {
    const error = { code: 'auth/invalid-credential' };
    expect(mapAuthError(error)).toBe('Invalid email or password. Please verify your credentials.');
  });

  it('maps rate limit error to security alert message', () => {
    const error = { code: 'auth/too-many-requests' };
    expect(mapAuthError(error)).toContain('Too many unsuccessful attempts');
  });

  it('avoids exposing raw server stack traces or internal errors', () => {
    const error = { message: 'Firebase: Error (auth/user-not-found).' };
    const mapped = mapAuthError(error);
    expect(mapped).not.toContain('Firebase: Error');
  });
});
