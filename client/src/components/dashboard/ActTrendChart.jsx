import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { formatColName, formatNumberValue } from '../../utils/smartDetector';
import { parseNumericValue, parseDateValue } from '../../utils/csvHelpers';

export function ActTrendChart({ data = [], trendInfo }) {
  if (!trendInfo || !data.length) return null;

  const { dateCol, numCol, dateFormat, peak, trough, forecast = [] } = trendInfo;

  const chartData = useMemo(() => {
    const sorted = [...data]
      .filter((r) => r[dateCol] && r[numCol] !== null && r[numCol] !== undefined)
      .sort((a, b) => {
        const da = parseDateValue(a[dateCol], dateFormat);
        const db = parseDateValue(b[dateCol], dateFormat);
        return (da ?? new Date(0)) - (db ?? new Date(0));
      });

    const step = Math.max(1, Math.floor(sorted.length / 60));
    const historical = sorted.filter((_, i) => i % step === 0).map((r) => ({
      name: String(r[dateCol]),
      val: parseNumericValue(r[numCol]) || 0,
      isPeak: String(r[dateCol]) === peak?.date,
      isTrough: String(r[dateCol]) === trough?.date
    }));

    if (!forecast.length || !historical.length) return historical;

    // "Bridge" point carries both val and forecastVal so the dashed
    // projection visually connects to exactly where the solid line ends,
    // rather than leaving a gap.
    const bridged = [
      ...historical.slice(0, -1),
      { ...historical[historical.length - 1], forecastVal: historical[historical.length - 1].val }
    ];
    const projected = forecast.map((f) => ({ name: f.date, forecastVal: f.value, isForecast: true }));

    return [...bridged, ...projected];
  }, [data, dateCol, numCol, dateFormat, peak, trough, forecast]);

  return (
    <div className="p-8 sm:p-10 bg-white border border-[var(--ink)]/10 rounded-[24px] shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-6 pb-4 border-b border-[var(--ink)]/8 font-sans">
        <div>
          <h4 className="font-serif text-2xl sm:text-3xl text-[var(--ink)] font-normal">
            {formatColName(numCol)} Trajectory
          </h4>
          <p className="font-mono text-xs text-[var(--muted)] uppercase tracking-wider mt-1">
            Timeline trajectory over {chartData.length} data points
            {forecast.length > 0 && (
              <span className="ml-2 text-[var(--muted-2)]">
                · dashed line is a simple linear projection, not a guaranteed forecast
              </span>
            )}
          </p>
        </div>

        {/* Minimal Clean Peak & Trough Metrics (No Pill Badges!) */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#b5470b]">
            <span className="w-2 h-2 rounded-full bg-[#b5470b] inline-block" />
            <span className="font-semibold">Peak: {peak.value}</span>
            <span className="text-[var(--muted)]">({peak.date})</span>
          </div>

          <div className="flex items-center gap-1.5 text-[var(--muted)]">
            <span className="w-2 h-2 rounded-full bg-[var(--muted)] inline-block" />
            <span className="font-semibold">Trough: {trough.value}</span>
            <span className="text-[var(--muted-2)]">({trough.date})</span>
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
                const entry = payload.find((p) => typeof p.value === 'number');
                if (!entry) return null;
                const d = entry.payload;
                const isForecast = entry.dataKey === 'forecastVal' && d.isForecast;
                return (
                  <div className="bg-white border border-[var(--ink)]/15 p-3.5 rounded-[12px] shadow-lg text-xs font-sans">
                    <p className="font-mono font-semibold text-[var(--ink)] mb-1 flex items-center gap-1.5">
                      {label}
                      {isForecast && (
                        <span className="text-[9px] uppercase tracking-wider text-[var(--muted-2)] font-normal">(Forecast)</span>
                      )}
                    </p>
                    <p className="font-mono text-[#b5470b] font-bold">
                      {formatColName(numCol)}: {entry.value.toLocaleString()}
                    </p>
                    {d.isPeak && <p className="text-[10px] text-[#b5470b] font-mono font-semibold mt-1">★ PEAK VALUE</p>}
                    {d.isTrough && <p className="text-[10px] text-[var(--muted)] font-mono font-semibold mt-1">▼ LOWEST TROUGH</p>}
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
            {forecast.length > 0 && (
              <Area
                type="monotone"
                dataKey="forecastVal"
                stroke="#b5470b"
                strokeWidth={2}
                strokeDasharray="6 5"
                fillOpacity={0}
                animationDuration={1200}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
