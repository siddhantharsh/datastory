import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { DEFAULT_COLORS } from '../../utils/chartPalettes';
import { formatColName, formatNumberValue } from '../../utils/smartDetector';

// Custom Clean Recharts Tooltip Component
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border border-[#161513]/15 p-3.5 rounded-[12px] shadow-xl text-xs font-sans">
      <p className="font-mono font-semibold text-[#161513] mb-2 pb-1 border-b border-[#161513]/10">
        {label}
      </p>
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5 font-medium text-[#6f6a62]">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
              {formatColName(entry.name || entry.dataKey)}:
            </span>
            <span className="font-mono font-bold text-[#161513]">
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartBuilder({ chart1Config, chart2Config, chart3Config, rows = [], meta = {}, displayColumns = [] }) {
  const { numericCols = [], categoricalCols = [], dateCol = null } = meta || {};
  const allColumns = meta?.types ? Object.keys(meta.types) : (rows[0] ? Object.keys(rows[0]) : []);
  
  // Use enabled displayColumns from sidebar attribute filter if provided
  const availableCols = displayColumns.length > 0 ? displayColumns : allColumns;
  const availableNumericCols = numericCols.filter((c) => availableCols.includes(c));
  const availableCategoricalCols = categoricalCols.filter((c) => availableCols.includes(c));

  // State for interactive axis overrides
  const [chart1X, setChart1X] = useState(null);
  const [chart1Y, setChart1Y] = useState(null);

  const [chart2X, setChart2X] = useState(null);
  const [chart2Y, setChart2Y] = useState(null);

  const [activeSeries, setActiveSeries] = useState({});

  // Active X/Y selections with fallback to valid available columns
  const activeC1X = (chart1X && availableCols.includes(chart1X)) ? chart1X : (availableCategoricalCols[0] || availableCols[0]);
  const activeC1Y = (chart1Y && (availableNumericCols.includes(chart1Y) || chart1Y === 'Count')) ? chart1Y : (availableNumericCols[0] || 'Count');

  const activeC2X = (chart2X && availableCols.includes(chart2X)) ? chart2X : (dateCol && availableCols.includes(dateCol) ? dateCol : (availableCategoricalCols[0] || availableCols[0]));
  const activeC2Y = (chart2Y && (availableNumericCols.includes(chart2Y) || chart2Y === 'Count')) ? chart2Y : (availableNumericCols[1] || availableNumericCols[0] || 'Count');

  // Dynamic aggregation for Chart 1 (Bar Chart)
  const barChartData = useMemo(() => {
    if (!rows || !rows.length || !activeC1X) return [];

    const map = {};
    rows.forEach((r) => {
      const rawVal = r[activeC1X];
      const key = rawVal !== undefined && rawVal !== null && rawVal !== '' ? String(rawVal).trim() : 'Other';
      const val = activeC1Y === 'Count' ? 1 : (Number(r[activeC1Y]) || 0);
      map[key] = (map[key] || 0) + val;
    });

    return Object.entries(map)
      .slice(0, 15)
      .map(([key, val]) => ({
        name: key,
        [activeC1Y]: Number(val.toFixed(2))
      }));
  }, [rows, activeC1X, activeC1Y]);

  // Dynamic aggregation for Chart 2 (Line Chart)
  const lineChartData = useMemo(() => {
    if (!rows || !rows.length || !activeC2X) return [];

    const isXDate = activeC2X === dateCol;
    const sortedRows = [...rows].sort((a, b) => {
      if (isXDate) return new Date(a[activeC2X]) - new Date(b[activeC2X]);
      return 0;
    });

    if (isXDate || sortedRows.length > 50) {
      const step = Math.max(1, Math.floor(sortedRows.length / 50));
      const sampled = sortedRows.filter((_, i) => i % step === 0);
      return sampled.map((r) => ({
        name: String(r[activeC2X] || '').trim(),
        [activeC2Y]: Number(r[activeC2Y]) || 0
      }));
    }

    const map = {};
    sortedRows.forEach((r) => {
      const key = String(r[activeC2X] || '').trim();
      const val = activeC2Y === 'Count' ? 1 : (Number(r[activeC2Y]) || 0);
      map[key] = (map[key] || 0) + val;
    });

    return Object.entries(map).map(([key, val]) => ({
      name: key,
      [activeC2Y]: Number(val.toFixed(2))
    }));
  }, [rows, activeC2X, activeC2Y, dateCol]);

  // Multi-metric Data for Chart 3
  const chart3YCols = availableNumericCols.length > 0 ? availableNumericCols.slice(0, 4) : numericCols.slice(0, 4);
  const activeC3X = (dateCol && availableCols.includes(dateCol)) ? dateCol : (availableCategoricalCols[0] || availableCols[0]);

  const areaChartData = useMemo(() => {
    if (!rows || !rows.length || !activeC3X) return [];

    const isXDate = activeC3X === dateCol;
    const sortedRows = [...rows].sort((a, b) => {
      if (isXDate) return new Date(a[activeC3X]) - new Date(b[activeC3X]);
      return 0;
    });

    const step = Math.max(1, Math.floor(sortedRows.length / 40));
    const sampled = sortedRows.filter((_, i) => i % step === 0);

    return sampled.map((r) => {
      const obj = { name: String(r[activeC3X] || '').trim() };
      chart3YCols.forEach((col) => {
        obj[col] = Number(r[col]) || 0;
      });
      return obj;
    });
  }, [rows, activeC3X, chart3YCols, dateCol]);

  const gridColor = '#f0f0f0';
  const textColor = '#6b6b6b';

  const toggleSeries = (col) => {
    setActiveSeries((prev) => ({ ...prev, [col]: !prev[col] }));
  };

  return (
    <div className="space-y-8 mb-8">
      
      {/* ROW 2: 2 Side-by-Side Chart Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CHART 1: BAR CHART */}
        <div className="p-7 bg-white border border-[#161513]/12 rounded-[20px] shadow-sm flex flex-col justify-between overflow-hidden transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#161513]/8">
            <div className="min-w-0 flex-1">
              <h3 className="font-serif font-normal text-2xl text-[#161513] truncate">
                {formatColName(activeC1Y)} by {formatColName(activeC1X)}
              </h3>
              <p className="font-mono text-xs text-[#9b958c] uppercase tracking-wider mt-0.5">
                Bar Chart · {rows.length.toLocaleString()} Filtered Records
              </p>
            </div>

            {/* Interactive Axis Dropdowns with Strict Width Constraints */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-[#faf9f7] border border-[#161513]/15 rounded-[8px] px-2 py-1 text-xs max-w-[140px] truncate">
                <span className="font-mono text-[10px] uppercase text-[#9b958c] mr-1 font-bold shrink-0">X:</span>
                <select
                  value={activeC1X}
                  onChange={(e) => setChart1X(e.target.value)}
                  className="bg-transparent text-xs font-mono font-medium text-[#161513] focus:outline-none cursor-pointer truncate w-full"
                >
                  {availableCols.map((c) => (
                    <option key={c} value={c}>
                      {formatColName(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center bg-[#faf9f7] border border-[#161513]/15 rounded-[8px] px-2 py-1 text-xs max-w-[140px] truncate">
                <span className="font-mono text-[10px] uppercase text-[#9b958c] mr-1 font-bold shrink-0">Y:</span>
                <select
                  value={activeC1Y}
                  onChange={(e) => setChart1Y(e.target.value)}
                  className="bg-transparent text-xs font-mono font-medium text-[#161513] focus:outline-none cursor-pointer truncate w-full"
                >
                  {availableNumericCols.map((c) => (
                    <option key={c} value={c}>
                      {formatColName(c)}
                    </option>
                  ))}
                  <option value="Count">Total Records</option>
                </select>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={textColor}
                  fontSize={11}
                  fontFamily="Inter, sans-serif"
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  stroke={textColor}
                  fontSize={11}
                  fontFamily="Inter, sans-serif"
                  tickLine={false}
                  tickFormatter={formatNumberValue}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey={activeC1Y}
                  fill={DEFAULT_COLORS[0]}
                  radius={[6, 6, 0, 0]}
                  animationDuration={800}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART 2: LINE CHART */}
        <div className="p-7 bg-white border border-[#161513]/12 rounded-[20px] shadow-sm flex flex-col justify-between overflow-hidden transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#161513]/8">
            <div className="min-w-0 flex-1">
              <h3 className="font-serif font-normal text-2xl text-[#161513] truncate">
                {formatColName(activeC2Y)} Trajectory
              </h3>
              <p className="font-mono text-xs text-[#9b958c] uppercase tracking-wider mt-0.5">
                Line Chart · Trend over {formatColName(activeC2X)}
              </p>
            </div>

            {/* Interactive Axis Dropdowns with Strict Width Constraints */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center bg-[#faf9f7] border border-[#161513]/15 rounded-[8px] px-2 py-1 text-xs max-w-[140px] truncate">
                <span className="font-mono text-[10px] uppercase text-[#9b958c] mr-1 font-bold shrink-0">X:</span>
                <select
                  value={activeC2X}
                  onChange={(e) => setChart2X(e.target.value)}
                  className="bg-transparent text-xs font-mono font-medium text-[#161513] focus:outline-none cursor-pointer truncate w-full"
                >
                  {availableCols.map((c) => (
                    <option key={c} value={c}>
                      {formatColName(c)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center bg-[#faf9f7] border border-[#161513]/15 rounded-[8px] px-2 py-1 text-xs max-w-[140px] truncate">
                <span className="font-mono text-[10px] uppercase text-[#9b958c] mr-1 font-bold shrink-0">Y:</span>
                <select
                  value={activeC2Y}
                  onChange={(e) => setChart2Y(e.target.value)}
                  className="bg-transparent text-xs font-mono font-medium text-[#161513] focus:outline-none cursor-pointer truncate w-full"
                >
                  {availableNumericCols.map((c) => (
                    <option key={c} value={c}>
                      {formatColName(c)}
                    </option>
                  ))}
                  <option value="Count">Total Records</option>
                </select>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={textColor}
                  fontSize={11}
                  fontFamily="Inter, sans-serif"
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  stroke={textColor}
                  fontSize={11}
                  fontFamily="Inter, sans-serif"
                  tickLine={false}
                  tickFormatter={formatNumberValue}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey={activeC2Y}
                  stroke={DEFAULT_COLORS[0]}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: DEFAULT_COLORS[0] }}
                  activeDot={{ r: 6, fill: DEFAULT_COLORS[0] }}
                  animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ROW 3: 1 FULL-WIDTH AREA CHART */}
      <div className="p-7 bg-white border border-[#161513]/12 rounded-[20px] shadow-sm overflow-hidden transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#161513]/8">
          <div>
            <h3 className="font-serif font-normal text-2xl text-[#161513]">
              Multi-Metric Overview ({formatColName(activeC3X)})
            </h3>
            <p className="font-mono text-xs text-[#9b958c] uppercase tracking-wider mt-0.5">
              Full-Width Area Chart · Click Series Badges to Toggle Overlay
            </p>
          </div>

          {/* Interactive Series Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {chart3YCols.map((col, idx) => {
              const color = DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
              const isHidden = activeSeries[col] === true;

              return (
                <button
                  key={col}
                  onClick={() => toggleSeries(col)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all cursor-pointer ${
                    !isHidden
                      ? 'bg-white border border-[#161513]/15 text-[#161513] shadow-xs'
                      : 'opacity-40 line-through bg-gray-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span>{formatColName(col)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <defs>
                {chart3YCols.map((col, idx) => {
                  const color = DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                  return (
                    <linearGradient key={col} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="name"
                stroke={textColor}
                fontSize={11}
                fontFamily="Inter, sans-serif"
                tickLine={false}
                dy={6}
              />
              <YAxis
                stroke={textColor}
                fontSize={11}
                fontFamily="Inter, sans-serif"
                tickLine={false}
                tickFormatter={formatNumberValue}
              />
              <Tooltip content={<CustomTooltip />} />
              {chart3YCols.map((col, idx) => {
                if (activeSeries[col]) return null;
                const color = DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                return (
                  <Area
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stroke={color}
                    fillOpacity={1}
                    fill={`url(#grad-${idx})`}
                    strokeWidth={2}
                    animationDuration={1000}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
