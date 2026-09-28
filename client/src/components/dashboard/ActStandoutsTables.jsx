import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatColName, formatNumberValue } from '../../utils/smartDetector';
import { parseNumericValue } from '../../utils/csvHelpers';

// A raw cell value of 0/false is a legitimate label (e.g. a 0/1-coded
// category), not a missing one — only null/undefined/'' should drop out.
function labelOrNull(val) {
  return val === null || val === undefined || val === '' ? null : String(val);
}

export function ActStandoutsTables({ standoutsInfo }) {
  if (!standoutsInfo || !standoutsInfo.top5) return null;

  const { top5, bottom5, numCol, categoryCol, dateCol, anomalies = [] } = standoutsInfo;

  return (
    <div className="space-y-6 font-sans">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* Top 5 Peak Records Table */}
      <div className="p-8 bg-emerald-50/50 border border-emerald-200/60 rounded-[24px] shadow-sm">
        <div className="mb-5 pb-3 border-b border-emerald-200/60">
          <h4 className="font-serif text-2xl text-emerald-950 font-normal">
            Top Peak Records
          </h4>
          <p className="font-mono text-xs text-emerald-800 uppercase tracking-wider mt-1">
            Highest {formatColName(numCol)} values
          </p>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          {top5.map((row, idx) => {
            const val = parseNumericValue(row[numCol]);
            const cat = categoryCol ? labelOrNull(row[categoryCol]) : null;
            const date = dateCol ? labelOrNull(row[dateCol]) : null;

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-[12px] bg-white/90 border border-emerald-200/50 hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="font-bold text-emerald-700 w-5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans font-medium text-[var(--ink)] truncate">
                    {[cat, date].filter(Boolean).join(' · ') || `Record #${idx + 1}`}
                  </span>
                </div>
                <span className="font-bold text-emerald-800 text-sm shrink-0">
                  {formatNumberValue(val)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom 5 Records Table */}
      <div className="p-8 bg-rose-50/50 border border-rose-200/60 rounded-[24px] shadow-sm">
        <div className="mb-5 pb-3 border-b border-rose-200/60">
          <h4 className="font-serif text-2xl text-rose-950 font-normal">
            Lowest Records
          </h4>
          <p className="font-mono text-xs text-rose-800 uppercase tracking-wider mt-1">
            Lowest {formatColName(numCol)} values
          </p>
        </div>

        <div className="space-y-2.5 font-mono text-xs">
          {bottom5.map((row, idx) => {
            const val = parseNumericValue(row[numCol]);
            const cat = categoryCol ? labelOrNull(row[categoryCol]) : null;
            const date = dateCol ? labelOrNull(row[dateCol]) : null;

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-[12px] bg-white/90 border border-rose-200/50 hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="font-bold text-rose-700 w-5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans font-medium text-[var(--ink)] truncate">
                    {[cat, date].filter(Boolean).join(' · ') || `Record #${idx + 1}`}
                  </span>
                </div>
                <span className="font-bold text-rose-800 text-sm shrink-0">
                  {formatNumberValue(val)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>

    {/* Statistical anomalies: records more than 2 std devs from the mean —
        a different signal than top5/bottom5, since an outlier can sit
        mid-range and still be unusual relative to how tightly the rest of
        the data clusters. */}
    {anomalies.length > 0 && (
      <div className="p-6 bg-amber-50/50 border border-amber-200/60 rounded-[20px]">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-amber-200/60">
          <AlertTriangle className="w-4 h-4 text-amber-700" />
          <h4 className="font-serif text-xl text-amber-950 font-normal">Unusual Records</h4>
          <span className="font-mono text-[10px] uppercase text-amber-700/70 tracking-wider">
            &gt;2 std devs from the mean
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {anomalies.map((a, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-[10px] bg-white/90 border border-amber-200/50 text-xs font-mono"
            >
              <span className="truncate text-[var(--ink)] font-medium">
                {[a.category, a.date].filter(Boolean).join(' · ') || `Record #${idx + 1}`}
              </span>
              <span className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="font-bold text-[var(--ink)]">{a.value}</span>
                <span className={`text-[10px] ${a.zScore > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  ({a.zScore > 0 ? '+' : ''}{a.zScore}σ)
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
    </div>
  );
}
