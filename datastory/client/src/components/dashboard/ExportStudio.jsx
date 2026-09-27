import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Download, FileText, Code, Check } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export function ExportStudio() {
  const { activeDataset } = useDataset();
  const [copied, setCopied] = useState(false);

  if (!activeDataset) return null;

  const handleExport = (format) => {
    window.open(`/api/export/${activeDataset.id}?format=${format}`, '_blank');
  };

  const copyJSONSummary = () => {
    const summary = {
      dataset: activeDataset.name,
      rowCount: activeDataset.rowCount || activeDataset.row_count,
      columns: activeDataset.columns,
      exportedAt: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mb-8 p-6 sm:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold text-[#2563eb] uppercase tracking-wider block mb-1">
            Export Studio
          </span>
          <h3 className="font-display font-bold text-xl text-[#1a1a1a]">Download & Sharing</h3>
          <p className="text-xs text-[#6b6b6b] mt-0.5">
            Export raw or filtered records in standardized formats.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="md"
            icon={FileText}
            onClick={() => handleExport('csv')}
          >
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="md"
            icon={Code}
            onClick={() => handleExport('json')}
          >
            Export JSON
          </Button>

          <Button
            variant="primary"
            size="md"
            icon={copied ? Check : Download}
            onClick={copyJSONSummary}
          >
            {copied ? 'Copied Meta!' : 'Copy Summary'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
