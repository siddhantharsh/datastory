import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { BarChart2, TrendingUp, Layers } from 'lucide-react';

const mockVisualizerData = [
  { month: 'Jan 24', attendance: 82, passengers: 1420, energy: 410 },
  { month: 'Mar 24', attendance: 88, passengers: 1680, energy: 480 },
  { month: 'May 24', attendance: 91, passengers: 1890, energy: 620 },
  { month: 'Jul 24', attendance: 78, passengers: 2100, energy: 740 },
  { month: 'Sep 24', attendance: 95, passengers: 1950, energy: 530 },
  { month: 'Nov 24', attendance: 89, passengers: 1720, energy: 460 },
  { month: 'Jan 25', attendance: 84, passengers: 1540, energy: 430 },
  { month: 'Mar 25', attendance: 93, passengers: 1810, energy: 490 },
  { month: 'May 25', attendance: 96, passengers: 2040, energy: 650 },
  { month: 'Jul 25', attendance: 80, passengers: 2250, energy: 780 }
];

export function InteractiveVisualizer({ onOpenFullDashboard }) {
  const [metric, setMetric] = useState('attendance');
  const [chartType, setChartType] = useState('area');

  const metricConfigs = {
    attendance: { name: 'Campus Attendance (%)', color: '#2563eb', unit: '%' },
    passengers: { name: 'Transport Passengers', color: '#10b981', unit: '' },
    energy: { name: 'Building kWh Used', color: '#f59e0b', unit: ' kWh' }
  };

  const currentConfig = metricConfigs[metric];

  return (
    <section className="py-32 bg-[#faf9f7]">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold text-[#2563eb] uppercase tracking-wider mb-2 block">
            Live Sandbox
          </span>
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#1a1a1a] tracking-tight mb-4">
            Experience Observatory In Action
          </h2>
          <p className="text-sm text-[#6b6b6b]">
            Toggle metrics and chart representations in real-time below.
          </p>
        </div>

        <Card className="gsap-reveal max-w-4xl mx-auto p-6 sm:p-8">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-[#1a1a1a]/10">
            {/* Metric Selector Buttons */}
            <div className="flex items-center gap-2 bg-[#faf9f7] p-1 rounded-[8px] border border-[#1a1a1a]/10">
              <button
                onClick={() => setMetric('attendance')}
                className={`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-all ${
                  metric === 'attendance'
                    ? 'bg-[#2563eb] text-white shadow-sm'
                    : 'text-[#6b6b6b] hover:text-[#1a1a1a]'
                }`}
              >
                Attendance
              </button>
              <button
                onClick={() => setMetric('passengers')}
                className={`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-all ${
                  metric === 'passengers'
                    ? 'bg-[#10b981] text-white shadow-sm'
                    : 'text-[#6b6b6b] hover:text-[#1a1a1a]'
                }`}
              >
                Transport
              </button>
              <button
                onClick={() => setMetric('energy')}
                className={`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-all ${
                  metric === 'energy'
                    ? 'bg-[#f59e0b] text-white shadow-sm'
                    : 'text-[#6b6b6b] hover:text-[#1a1a1a]'
                }`}
              >
                Energy
              </button>
            </div>

            {/* Chart Type Selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setChartType('area')}
                className={`p-2 rounded-[8px] border text-xs font-medium transition-all ${
                  chartType === 'area'
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-white text-[#6b6b6b] border-[#1a1a1a]/15 hover:text-[#1a1a1a]'
                }`}
                title="Area Chart"
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-2 rounded-[8px] border text-xs font-medium transition-all ${
                  chartType === 'bar'
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-white text-[#6b6b6b] border-[#1a1a1a]/15 hover:text-[#1a1a1a]'
                }`}
                title="Bar Chart"
              >
                <BarChart2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`p-2 rounded-[8px] border text-xs font-medium transition-all ${
                  chartType === 'line'
                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                    : 'bg-white text-[#6b6b6b] border-[#1a1a1a]/15 hover:text-[#1a1a1a]'
                }`}
                title="Line Chart"
              >
                <TrendingUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Recharts Render Container */}
          <div className="h-72 sm:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={mockVisualizerData}>
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={currentConfig.color} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={currentConfig.color} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,26,26,0.06)" />
                  <XAxis dataKey="month" stroke="#6b6b6b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#6b6b6b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      borderRadius: '8px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    name={currentConfig.name}
                    stroke={currentConfig.color}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#areaGradient)"
                  />
                </AreaChart>
              ) : chartType === 'bar' ? (
                <BarChart data={mockVisualizerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,26,26,0.06)" />
                  <XAxis dataKey="month" stroke="#6b6b6b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#6b6b6b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      borderRadius: '8px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px'
                    }}
                  />
                  <Bar
                    dataKey={metric}
                    name={currentConfig.name}
                    fill={currentConfig.color}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              ) : (
                <LineChart data={mockVisualizerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,26,26,0.06)" />
                  <XAxis dataKey="month" stroke="#6b6b6b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#6b6b6b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      borderRadius: '8px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    name={currentConfig.name}
                    stroke={currentConfig.color}
                    strokeWidth={3}
                    dot={{ r: 4, fill: currentConfig.color }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-6 pt-6 border-t border-[#1a1a1a]/10 flex items-center justify-between">
            <p className="text-xs text-[#6b6b6b]">
              Full studio offers multi-attribute stacking, categorical grouping & dynamic exports.
            </p>
            <Button variant="accentGhost" size="sm" onClick={onOpenFullDashboard}>
              Open Full Studio →
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
