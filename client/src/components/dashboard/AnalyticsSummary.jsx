import React, { useMemo } from 'react';
import { inferColumnTypes, calculateColumnStats } from '../../utils/csvHelpers';
import { formatColName } from '../../utils/smartDetector';
import { Calculator } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export function AnalyticsSummary() {
  const { activeDataset } = useDataset();

  const statsList = useMemo(() => {
    if (!activeDataset || !activeDataset.rows || activeDataset.rows.length === 0) {
      return [];
    }

    const rows = activeDataset.rows;
    const columns = activeDataset.columns || Object.keys(rows[0]);
    const colTypes = inferColumnTypes(rows, columns);

    const numCols = columns.filter((c) => colTypes[c] === 'number');

    return numCols.map((col) => {
      const stats = calculateColumnStats(rows, col);
      return { column: col, stats };
    }).filter((item) => item.stats !== null);
  }, [activeDataset]);

  if (!activeDataset || statsList.length === 0) return null;

  return (
    <div className="p-7 bg-white border border-[var(--ink)]/12 rounded-[18px] card-shadow mb-8 transition-all">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--ink)]/8">
        <div className="w-9 h-9 rounded-[10px] bg-[#b5470b]/10 text-[#b5470b] flex items-center justify-center shrink-0">
          <Calculator className="w-5 h-5 stroke-[1.8]" />
        </div>
        <div>
          <h3 className="font-serif font-normal text-2xl text-[var(--ink)]">Statistical Summary Matrix</h3>
          <p className="font-mono text-xs text-[var(--muted-2)] uppercase tracking-wider mt-0.5">
            Automated mathematical breakdown for numeric attributes
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsList.map(({ column, stats }) => (
          <div
            key={column}
            className="p-5 bg-[var(--bg)] border border-[var(--ink)]/10 rounded-[14px] space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[var(--ink)]/8 pb-2">
              <span className="font-serif font-normal text-lg text-[var(--ink)] truncate">
                {formatColName(column)}
              </span>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 bg-[#b5470b]/10 text-[#b5470b] rounded-full font-semibold">
                N={stats.count}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="bg-white p-2.5 rounded-[8px] border border-[var(--ink)]/8">
                <span className="text-[10px] text-[var(--muted-2)] uppercase block font-semibold">Average</span>
                <span className="font-bold text-[var(--ink)] text-sm">{stats.avg.toLocaleString()}</span>
              </div>
              <div className="bg-white p-2.5 rounded-[8px] border border-[var(--ink)]/8">
                <span className="text-[10px] text-[var(--muted-2)] uppercase block font-semibold">Sum Total</span>
                <span className="font-bold text-[var(--ink)] text-sm">{stats.sum.toLocaleString()}</span>
              </div>
              <div className="bg-white p-2.5 rounded-[8px] border border-[var(--ink)]/8">
                <span className="text-[10px] text-[var(--muted-2)] uppercase block font-semibold">Min / Max</span>
                <span className="font-bold text-[var(--ink)] text-xs">
                  {stats.min} / {stats.max}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-[8px] border border-[var(--ink)]/8">
                <span className="text-[10px] text-[var(--muted-2)] uppercase block font-semibold">Std Dev</span>
                <span className="font-bold text-[var(--ink)] text-xs">±{stats.stdDev}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
