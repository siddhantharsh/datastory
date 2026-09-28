import React, { useEffect, useState } from 'react';
import { formatNumberValue } from '../../utils/smartDetector';
import { parseNumericValue } from '../../utils/csvHelpers';

export function KPICards({ kpiConfigs = [], rows = [], meta = {} }) {
  const [displayVals, setDisplayVals] = useState([0, 0, 0, 0]);

  // Compute metric values from filtered rows. Returns null (rendered as "—")
  // when a metric has no numeric column to aggregate, rather than silently
  // falling back to the row count under a misleading Avg/Max/Sum label.
  const computeValue = (config) => {
    if (!rows || !rows.length) return config.metricType === 'COUNT' ? 0 : null;
    if (config.metricType === 'COUNT') return rows.length;

    const col = config.col;
    if (!col) return null;

    const vals = rows
      .map((r) => parseNumericValue(r[col]))
      .filter((v) => !isNaN(v) && v !== null && v !== undefined);

    if (!vals.length) return 0;

    if (config.metricType === 'AVG') {
      const sum = vals.reduce((a, b) => a + b, 0);
      return Number((sum / vals.length).toFixed(2));
    }
    if (config.metricType === 'MAX') {
      return Math.max(...vals);
    }
    if (config.metricType === 'SUM') {
      const sum = vals.reduce((a, b) => a + b, 0);
      return Number(sum.toFixed(2));
    }

    return vals[0] || 0;
  };

  const targetVals = kpiConfigs.map(computeValue);

  // Animated Count-Up Effect
  useEffect(() => {
    let animId = null;
    const startTime = performance.now();
    const duration = 1200;

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      const current = targetVals.map((target) => (target === null ? null : target * ease));
      setDisplayVals(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayVals(targetVals);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [rows, JSON.stringify(targetVals)]);

  // Sparkline SVG path
  const getSparklinePath = (col) => {
    if (!col || !rows || rows.length < 2) return null;
    const sample = rows.slice(-30);
    const vals = sample.map((r) => parseNumericValue(r[col])).filter((v) => !isNaN(v));
    if (vals.length < 2) return null;

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;

    const width = 100;
    const height = 32;

    const points = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiConfigs.map((config, idx) => {
        const val = displayVals[idx] !== undefined ? displayVals[idx] : targetVals[idx];
        const sparklineD = getSparklinePath(config.col);

        return (
          <div
            key={config.id || idx}
            className="p-8 bg-white border border-[#161513]/10 rounded-[20px] shadow-sm flex flex-col justify-between transition-all hover:border-[#b5470b]/40"
          >
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-[#6f6a62] font-medium mb-3 truncate">
                {config.title}
              </div>

              <div className="font-serif font-normal text-4xl sm:text-5xl text-[#161513] tracking-tight mb-4">
                {val === null ? '—' : formatNumberValue(val)}
              </div>
            </div>

            {sparklineD ? (
              <div className="h-8 w-full pt-1">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 32">
                  <path
                    d={sparklineD}
                    fill="none"
                    stroke="#b5470b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ) : (
              <div className="text-[11px] font-mono text-[#6f6a62] pt-1">
                Total aggregate count
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
