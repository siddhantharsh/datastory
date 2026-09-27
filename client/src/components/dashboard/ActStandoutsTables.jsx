import React from 'react';
import { formatColName, formatNumberValue } from '../../utils/smartDetector';

export function ActStandoutsTables({ standoutsInfo }) {
  if (!standoutsInfo || !standoutsInfo.top5) return null;

  const { top5, bottom5, numCol, categoryCol, dateCol } = standoutsInfo;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 font-sans">
      
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
            const val = Number(row[numCol]);
            const cat = categoryCol ? row[categoryCol] : null;
            const date = dateCol ? row[dateCol] : null;

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-[12px] bg-white/90 border border-emerald-200/50 hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="font-bold text-emerald-700 w-5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans font-medium text-[#161513] truncate">
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
            const val = Number(row[numCol]);
            const cat = categoryCol ? row[categoryCol] : null;
            const date = dateCol ? row[dateCol] : null;

            return (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-[12px] bg-white/90 border border-rose-200/50 hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="font-bold text-rose-700 w-5">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans font-medium text-[#161513] truncate">
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
  );
}
