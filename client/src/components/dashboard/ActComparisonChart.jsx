import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { DEFAULT_COLORS } from '../../utils/chartPalettes';
import { formatColName, formatNumberValue } from '../../utils/smartDetector';

export function ActComparisonChart({ data = [], comparisonInfo }) {
  if (!comparisonInfo || !data.length) return null;

  const { col1, col2, xCol, correlation } = comparisonInfo;

  const chartData = useMemo(() => {
    if (!xCol) return [];
    const step = Math.max(1, Math.floor(data.length / 40));
    return data.filter((_, i) => i % step === 0).map((r) => ({
      name: String(r[xCol] || '').trim(),
      [col1]: Number(r[col1]) || 0,
      [col2]: Number(r[col2]) || 0
    }));
  }, [data, col1, col2, xCol]);

  return (
    <div className="p-8 sm:p-10 bg-white border border-[#161513]/10 rounded-[24px] shadow-sm font-sans">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6 pb-4 border-b border-[#161513]/8">
        <div>
          <h4 className="font-serif text-2xl sm:text-3xl text-[#161513] font-normal">
            {formatColName(col1)} vs {formatColName(col2)}
          </h4>
          <p className="font-mono text-xs text-[#6f6a62] uppercase tracking-wider mt-1">
            Dual Metric Co-movement Analysis
          </p>
        </div>

        {/* Minimal Clean Text Correlation Score */}
        <div className="font-mono text-xs text-[#b5470b] font-semibold">
          Pearson Correlation r = {correlation}
        </div>
      </div>

      <div className="h-80 sm:h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <defs>
              <linearGradient id="compGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DEFAULT_COLORS[0]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={DEFAULT_COLORS[0]} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="compGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DEFAULT_COLORS[1]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={DEFAULT_COLORS[1]} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#6b6b6b"
              fontSize={11}
              fontFamily="Inter, sans-serif"
              tickLine={false}
              dy={6}
            />
            <YAxis
              stroke="#6b6b6b"
              fontSize={11}
              fontFamily="Inter, sans-serif"
              tickLine={false}
              tickFormatter={formatNumberValue}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="bg-white border border-[#161513]/15 p-3.5 rounded-[12px] shadow-lg text-xs font-sans space-y-1">
                    <p className="font-mono font-semibold text-[#161513] mb-1.5">{label}</p>
                    {payload.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 font-mono">
                        <span className="flex items-center gap-1.5 text-[#6f6a62]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          {formatColName(entry.name)}:
                        </span>
                        <span className="font-bold text-[#161513]">{entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey={col1}
              stroke={DEFAULT_COLORS[0]}
              fillOpacity={1}
              fill="url(#compGrad1)"
              strokeWidth={2}
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey={col2}
              stroke={DEFAULT_COLORS[1]}
              fillOpacity={1}
              fill="url(#compGrad2)"
              strokeWidth={2}
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
