import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatColName, formatNumberValue } from '../../utils/smartDetector';

export function ActTrendChart({ data = [], trendInfo }) {
  if (!trendInfo || !data.length) return null;

  const { dateCol, numCol, peak, trough } = trendInfo;

  const chartData = useMemo(() => {
    const sorted = [...data]
      .filter((r) => r[dateCol] && r[numCol] !== null && r[numCol] !== undefined)
      .sort((a, b) => new Date(a[dateCol]) - new Date(b[dateCol]));

    const step = Math.max(1, Math.floor(sorted.length / 60));
    return sorted.filter((_, i) => i % step === 0).map((r) => ({
      name: String(r[dateCol]),
      val: Number(r[numCol]) || 0,
      isPeak: String(r[dateCol]) === peak?.date,
      isTrough: String(r[dateCol]) === trough?.date
    }));
  }, [data, dateCol, numCol, peak, trough]);

  return (
    <div className="p-8 sm:p-10 bg-white border border-[#161513]/10 rounded-[24px] shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6 pb-4 border-b border-[#161513]/8 font-sans">
        <div>
          <h4 className="font-serif text-2xl sm:text-3xl text-[#161513] font-normal">
            {formatColName(numCol)} Trajectory
          </h4>
          <p className="font-mono text-xs text-[#6f6a62] uppercase tracking-wider mt-1">
            Timeline trajectory over {chartData.length} data points
          </p>
        </div>

        {/* Minimal Clean Peak & Trough Metrics (No Pill Badges!) */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#b5470b]">
            <span className="w-2 h-2 rounded-full bg-[#b5470b] inline-block" />
            <span className="font-semibold">Peak: {peak.value}</span>
            <span className="text-[#6f6a62]">({peak.date})</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#6f6a62]">
            <span className="w-2 h-2 rounded-full bg-[#6f6a62] inline-block" />
            <span className="font-semibold">Trough: {trough.value}</span>
            <span className="text-[#9b958c]">({trough.date})</span>
          </div>
        </div>
      </div>

      <div className="h-80 sm:h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#b5470b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#b5470b" stopOpacity={0.0} />
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
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-[#161513]/15 p-3.5 rounded-[12px] shadow-lg text-xs font-sans">
                    <p className="font-mono font-semibold text-[#161513] mb-1">{label}</p>
                    <p className="font-mono text-[#b5470b] font-bold">
                      {formatColName(numCol)}: {payload[0].value.toLocaleString()}
                    </p>
                    {d.isPeak && <p className="text-[10px] text-[#b5470b] font-mono font-semibold mt-1">★ PEAK VALUE</p>}
                    {d.isTrough && <p className="text-[10px] text-[#6f6a62] font-mono font-semibold mt-1">▼ LOWEST TROUGH</p>}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="val"
              stroke="#b5470b"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#trendGrad)"
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
