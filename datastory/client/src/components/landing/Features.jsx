import React from 'react';
import { Card } from '../ui/Card';
import { FileSpreadsheet, BarChart2, Download } from 'lucide-react';

export function Features() {
  const capabilities = [
    {
      num: '01',
      icon: FileSpreadsheet,
      title: 'Smart Detection',
      description: 'Drop any CSV. We auto-detect dates, numbers, categories, and text columns. No config needed.'
    },
    {
      num: '02',
      icon: BarChart2,
      title: 'Live Visualizations',
      description: "Bar charts, line graphs, area plots — generated automatically from your data's shape."
    },
    {
      num: '03',
      icon: Download,
      title: 'Filter & Export',
      description: 'Drill down with smart filters. Search your table. Export exactly what you need.'
    }
  ];

  return (
    <section className="relative py-32 border-b border-[#161513]/10">
      {/* Section Index Header matching justus-john */}
      <div className="max-w-[1200px] mx-auto px-6 mb-16 flex items-baseline gap-4">
        <span className="font-mono text-xs font-semibold text-[#b5470b] tracking-wider">01</span>
        <span className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#9b958c]">
          WHAT DATASTORY DOES
        </span>
      </div>

      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {capabilities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="gsap-reveal p-8 bg-white border border-[#161513]/12 rounded-[16px] card-shadow flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:border-[#b5470b]/40"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-12 h-12 rounded-[10px] bg-[#faf9f7] border border-[#161513]/10 text-[#b5470b] flex items-center justify-center">
                      <Icon className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <span className="font-mono text-xs text-[#9b958c] font-semibold">{item.num}</span>
                  </div>

                  <h3 className="font-serif font-normal text-3xl text-[#161513] mb-3">
                    {item.title}
                  </h3>

                  <p className="text-sm text-[#44413c] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
