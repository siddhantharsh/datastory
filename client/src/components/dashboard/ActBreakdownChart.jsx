import React from 'react';
import { formatColName, formatNumberValue } from '../../utils/smartDetector';

export function ActBreakdownChart({ breakdownInfo }) {
  if (!breakdownInfo || !breakdownInfo.sortedCats) return null;

  const { sortedCats, categoryCol, numCol } = breakdownInfo;
  const maxVal = sortedCats[0]?.value || 1;

  return (
    <div className="p-8 sm:p-10 bg-white border border-[var(--ink)]/10 rounded-[24px] shadow-sm font-sans">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6 pb-4 border-b border-[var(--ink)]/8">
        <div>
          <h4 className="font-serif text-2xl sm:text-3xl text-[var(--ink)] font-normal">
            {formatColName(categoryCol)} Distribution
          </h4>
          <p className="font-mono text-xs text-[var(--muted)] uppercase tracking-wider mt-1">
            Ranked by total {formatColName(numCol)}
          </p>
        </div>
      </div>

      {/* Horizontal Staggered Growing Bars */}
      <div className="space-y-4">
        {sortedCats.map((cat, idx) => {
          const pct = Math.max(4, Math.min(100, (cat.value / maxVal) * 100));
          const isTop = idx === 0;

          return (
            <div key={cat.name} className="group">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${isTop ? 'text-[#b5470b]' : 'text-[var(--muted)]'}`}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans font-medium text-[var(--ink)] group-hover:text-[#b5470b] transition-colors">
                    {cat.name}
                  </span>
                </div>
                <span className="font-semibold text-[var(--ink)]">{formatNumberValue(cat.value)}</span>
              </div>

              {/* Progress Bar Container */}
              <div className="h-3.5 w-full bg-[var(--bg)] rounded-full overflow-hidden border border-[var(--ink)]/8">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    isTop ? 'bg-[#b5470b]' : 'bg-[var(--ink)]/20 group-hover:bg-[#b5470b]/60'
                  }`}
                  style={{
                    width: `${pct}%`,
                    transitionDelay: `${idx * 0.08}s`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
