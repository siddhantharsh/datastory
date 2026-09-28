import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // must match server/routes/upload.js's multer limit

export function UploadModal({ isOpen, onClose, onSuccess }) {
  const { uploadDataset } = useDataset();
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [warnings, setWarnings] = useState(null);

  const acceptFile = (candidate) => {
    if (!(candidate.type === 'text/csv' || candidate.name.endsWith('.csv'))) {
      setError('Please select a valid CSV file.');
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setError(`"${candidate.name}" is ${(candidate.size / (1024 * 1024)).toFixed(1)}MB, which exceeds the 10MB upload limit.`);
      return;
    }
    setFile(candidate);
    setDatasetName(candidate.name.replace(/\.csv$/i, ''));
    setError(null);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) acceptFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      const uploaded = await uploadDataset(file, datasetName);
      setFile(null);
      setDatasetName('');
      if (uploaded.warnings && uploaded.warnings.length > 0) {
        // Keep the modal open one more beat so parse warnings aren't
        // silently dropped — the dataset is already active underneath.
        setWarnings(uploaded.warnings);
      } else {
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const dismissWarnings = () => {
    setWarnings(null);
    onClose();
    if (onSuccess) onSuccess();
  };

  if (warnings) {
    return (
      <Modal isOpen={isOpen} onClose={dismissWarnings} title="Dataset Imported — With Some Notes">
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[8px] flex items-start gap-2 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <ul className="space-y-1 list-disc list-inside">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="primary" onClick={dismissWarnings}>
              Continue
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Custom CSV Dataset">
      <form onSubmit={handleUpload} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[8px] flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-[12px] p-8 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-[#2563eb] bg-[#2563eb]/5'
              : file
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-[#1a1a1a]/20 bg-white hover:border-[#2563eb]/50'
          }`}
          onClick={() => document.getElementById('csv-file-input').click()}
        >
          <input
            id="csv-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {file ? (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
              <p className="font-medium text-[#1a1a1a]">{file.name}</p>
              <p className="text-xs text-[#6b6b6b]">
                {(file.size / 1024).toFixed(1)} KB · Ready to ingest
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <UploadCloud className="w-10 h-10 text-[#2563eb]" />
              <p className="font-medium text-[#1a1a1a] text-sm">
                Drag and drop your CSV file here, or <span className="text-[#2563eb] underline">browse</span>
              </p>
              <p className="text-xs text-[#6b6b6b]">Supports standard CSV files up to 10MB</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider mb-1.5">
            Dataset Name
          </label>
          <input
            type="text"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            placeholder="e.g. Q4 Sales Report"
            required
            className="w-full px-3.5 py-2 text-sm bg-white border border-[#1a1a1a]/15 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!file || isUploading}>
            {isUploading ? 'Ingesting CSV...' : 'Import Dataset'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
