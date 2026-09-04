import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { uploadDataset, ApiError } from '../../services/api';
import { DatasetProfile } from '../../types/dataset';
import { formatBytes } from '../../lib/utils';

interface DatasetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: DatasetProfile) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTENSIONS = ['.csv', '.xlsx'];

export function DatasetUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: DatasetUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'profiling' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState<{ code?: string; message: string; details?: any } | null>(null);
  const [uploadedProfile, setUploadedProfile] = useState<DatasetProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setErrorDetails(null);
    const ext = `.${selectedFile.name.split('.').pop()?.toLowerCase()}`;

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorDetails({
        code: 'UNSUPPORTED_FORMAT',
        message: `Unsupported format '${ext}'. Please select a modern .csv or .xlsx file.`,
      });
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorDetails({
        code: 'FILE_TOO_LARGE',
        message: `File exceeds 50 MB limit (${formatBytes(selectedFile.size)}).`,
      });
      setFile(null);
      return;
    }

    if (selectedFile.size === 0) {
      setErrorDetails({
        code: 'EMPTY_FILE',
        message: 'Selected file is empty (0 bytes).',
      });
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setStatus('uploading');
      setErrorDetails(null);

      // Transition to profiling state indicator after short delay
      setTimeout(() => {
        setStatus((current) => (current === 'uploading' ? 'profiling' : current));
      }, 700);

      const response = await uploadDataset(file);
      setUploadedProfile(response.dataset);
      setStatus('success');
      onSuccess(response.dataset);
    } catch (err: any) {
      setStatus('error');
      console.error('[DatasetUploadModal] Upload failed:', err);
      if (err instanceof ApiError) {
        setErrorDetails({
          code: err.code || 'UPLOAD_FAILED',
          message: err.message || 'Dataset processing encountered an error.',
          details: err.details,
        });
      } else {
        setErrorDetails({
          code: err?.code || 'UPLOAD_FAILED',
          message: err?.message || 'Failed to upload and process dataset.',
          details: err?.details,
        });
      }
    }
  };

  const resetModal = () => {
    setFile(null);
    setStatus('idle');
    setErrorDetails(null);
    setUploadedProfile(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        id="dataset-upload-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Upload & Ingest Dataset
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                FastAPI & Pandas deterministic schema inference pipeline
              </p>
            </div>
          </div>
          <button
            onClick={resetModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {status === 'success' && uploadedProfile ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                    Ingestion & Schema Inference Complete
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    Dataset <strong>{uploadedProfile.fileName}</strong> was parsed into {uploadedProfile.rowCount.toLocaleString()} rows and {uploadedProfile.columnCount} columns.
                  </p>
                </div>
              </div>

              {/* Profile Snapshot Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold block">
                    Data Quality
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {uploadedProfile.dataQualityScore}/100
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold block">
                    Rows × Cols
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {uploadedProfile.rowCount} × {uploadedProfile.columnCount}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold block">
                    Missing Cells
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {uploadedProfile.missingDataPercentage}%
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="primary" onClick={resetModal}>
                  View Full Profile
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                    : file
                    ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="flex flex-col items-center space-y-2 text-center">
                    <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                      <FileCheck className="w-8 h-8" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 max-w-xs truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[11px] mt-1">
                      Ready for Pandas ingestion
                    </Badge>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3 text-center">
                    <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Drag and drop your dataset here, or{' '}
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline">
                          browse
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Supports CSV (.csv) and Excel (.xlsx) up to 50 MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorDetails && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-rose-900 dark:text-rose-200">Upload Failed</span>
                      {errorDetails.code && (
                        <span className="px-1.5 py-0.5 font-mono text-[10px] uppercase font-bold tracking-wider bg-rose-200/70 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 rounded">
                          {errorDetails.code}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{errorDetails.message}</p>
                    {errorDetails.details && (
                      <p className="text-[11px] font-mono opacity-80 pt-0.5 text-slate-500 dark:text-slate-400">
                        {typeof errorDetails.details === 'string' ? errorDetails.details : JSON.stringify(errorDetails.details)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Feedback */}
              {(status === 'uploading' || status === 'profiling') && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      {status === 'uploading'
                        ? 'Streaming dataset to FastAPI backend...'
                        : 'Running Pandas schema inference & deterministic profiling...'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-indigo-600 transition-all duration-500 ${
                        status === 'uploading' ? 'w-1/2 animate-pulse' : 'w-5/6'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetModal}
                  disabled={status === 'uploading' || status === 'profiling'}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUpload}
                  disabled={!file || status === 'uploading' || status === 'profiling'}
                  icon={
                    status === 'uploading' || status === 'profiling' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )
                  }
                >
                  {status === 'uploading'
                    ? 'Uploading...'
                    : status === 'profiling'
                    ? 'Profiling...'
                    : 'Ingest Dataset'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
