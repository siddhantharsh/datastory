import React, { useState, useRef, useEffect } from 'react';
import { useDataset } from '../../context/DatasetContext';
import { UploadModal } from '../ui/UploadModal';
import { Database, Upload, Trash2, FileSpreadsheet, ArrowLeft, Download, ChevronDown, FileCode, Table, Link2, Check } from 'lucide-react';

export function DatasetHeader({ onBackToHome, filteredRows = [] }) {
  const { datasets, activeDataset, selectDataset, deleteDataset, loading, isEditor } = useDataset();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const exportRef = useRef(null);

  // The URL is kept in sync with the active dataset + filters/columns/type
  // overrides by DashboardPage as the user interacts, so copying it here
  // always reflects the current view — a reopened link restores the same state.
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Clipboard API unavailable/denied — no-op, the button just won't confirm.
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setIsExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCSV = (rowsToExport, filenameSuffix = 'filtered') => {
    if (!rowsToExport || !rowsToExport.length) return;
    const headers = Object.keys(rowsToExport[0]);
    const csvLines = [headers.join(',')];

    rowsToExport.forEach((row) => {
      const line = headers.map((h) => {
        let val = row[h];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""');
        return val.includes(',') || val.includes('\n') ? `"${val}"` : val;
      }).join(',');
      csvLines.push(line);
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDataset?.name || 'dataset'}_${filenameSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  };

  const handleExportJSON = (rowsToExport) => {
    if (!rowsToExport || !rowsToExport.length) return;
    const jsonStr = JSON.stringify(rowsToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDataset?.name || 'dataset'}_filtered.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  };

  if (!activeDataset && loading) {
    return (
      <div className="bg-white rounded-[24px] border border-[#161513]/10 p-8 shadow-sm mb-8 animate-pulse">
        <div className="h-7 w-56 bg-[#161513]/10 rounded mb-3" />
        <div className="h-4 w-36 bg-[#161513]/5 rounded" />
      </div>
    );
  }

  const rowsCount = activeDataset?.rowCount || activeDataset?.row_count || activeDataset?.rows?.length || 0;
  const colsCount = activeDataset?.colCount || activeDataset?.col_count || activeDataset?.columns?.length || 0;

  return (
    <>
      <div className="bg-white rounded-[24px] border border-[#161513]/10 p-8 shadow-sm mb-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all">
        
        {/* Left Side: Back Home + Title & Metadata */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#b5470b] hover:underline cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to home</span>
            </button>
            <span className="text-[#9b958c] font-mono text-xs">02 · DATASTORY DASHBOARD</span>
          </div>

          <div className="flex items-center gap-4 mb-2">
            <h1 className="font-serif font-normal text-3xl sm:text-4xl text-[#161513] tracking-tight">
              {activeDataset?.name || 'Select a Dataset'}
            </h1>
            <span className="text-xs font-mono text-[#6f6a62] uppercase tracking-wider font-medium">
              {activeDataset?.isSample ? 'Sample Dataset' : 'Custom CSV'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#6f6a62]">
            <span className="font-medium text-[#161513]">
              {rowsCount.toLocaleString()} Total Records
            </span>
            <span className="text-[#9b958c]">·</span>
            <span className="font-medium text-[#161513]">{colsCount} Attributes</span>
            {activeDataset?.filename && (
              <>
                <span className="text-[#9b958c]">·</span>
                <span className="text-[#6f6a62]">{activeDataset.filename}</span>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Actions (Dataset Switcher, Upload, Export) */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Dataset Selector Dropdown */}
          <div className="flex items-center bg-[#faf9f7] border border-[#161513]/15 rounded-[12px] px-3.5 py-2.5 text-xs">
            <Database className="w-4 h-4 text-[#b5470b] mr-2 shrink-0" />
            <select
              value={activeDataset?.id || ''}
              onChange={(e) => selectDataset(e.target.value)}
              className="bg-transparent text-xs font-mono font-semibold text-[#161513] focus:outline-none cursor-pointer pr-2"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id} className="bg-white font-sans text-xs">
                  {d.name} ({d.row_count || d.rowCount} rows)
                </option>
              ))}
            </select>
          </div>

          {isEditor && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] border border-[#161513]/15 bg-white text-xs font-sans font-medium text-[#161513] hover:bg-[#faf9f7] transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#b5470b]" />
              <span>Upload CSV</span>
            </button>
          )}

          {/* Copy shareable link: current dataset + filters + visible columns + type overrides */}
          <button
            onClick={handleCopyLink}
            title="Copy a link to this exact filtered view"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] border border-[#161513]/15 bg-white text-xs font-sans font-medium text-[#161513] hover:bg-[#faf9f7] transition-all cursor-pointer"
          >
            {linkCopied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 text-[#b5470b]" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Export Dropdown Menu */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-[#b5470b] text-white hover:bg-[#963907] transition-all text-xs font-sans font-medium cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export Data</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-[#161513]/15 rounded-[14px] shadow-xl z-50 py-2 font-sans text-xs">
                <button
                  onClick={() => handleExportCSV(filteredRows, 'filtered')}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#faf9f7] text-[#161513] flex items-center gap-2.5 cursor-pointer font-medium"
                >
                  <Table className="w-4 h-4 text-[#b5470b]" />
                  <span>Export filtered CSV ({filteredRows.length} rows)</span>
                </button>
                <button
                  onClick={() => handleExportCSV(activeDataset?.rows || [], 'full')}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#faf9f7] text-[#161513] flex items-center gap-2.5 cursor-pointer font-medium border-t border-[#161513]/8"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#b5470b]" />
                  <span>Export full CSV ({rowsCount} rows)</span>
                </button>
                <button
                  onClick={() => handleExportJSON(filteredRows)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#faf9f7] text-[#161513] flex items-center gap-2.5 cursor-pointer font-medium border-t border-[#161513]/8"
                >
                  <FileCode className="w-4 h-4 text-[#b5470b]" />
                  <span>Export as JSON</span>
                </button>
              </div>
            )}
          </div>

          {isEditor && activeDataset && !activeDataset.isSample && (
            <button
              className="p-2.5 text-red-600 hover:bg-red-50 rounded-[12px] border border-red-200 transition-colors cursor-pointer"
              title="Delete custom dataset"
              onClick={() => {
                if (window.confirm(`Delete custom dataset "${activeDataset.name}"?`)) {
                  deleteDataset(activeDataset.id);
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </>
  );
}
