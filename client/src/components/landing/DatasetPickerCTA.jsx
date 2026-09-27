import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { UploadModal } from '../ui/UploadModal';
import { Users, Bus, Zap, UploadCloud, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export function DatasetPickerCTA({ onSelectDataset }) {
  const { datasets, selectDataset } = useDataset();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const datasetMeta = [
    {
      idKey: 'campus',
      name: 'Campus Attendance',
      desc: 'Track presence across departments and years',
      rows: '500 rows · 6 columns',
      icon: Users
    },
    {
      idKey: 'transport',
      name: 'City Transport',
      desc: 'Bus routes, ridership, revenue, and delays',
      rows: '500 rows · 7 columns',
      icon: Bus
    },
    {
      idKey: 'energy',
      name: 'Energy Consumption',
      desc: 'Building-level power usage and solar generation',
      rows: '500 rows · 7 columns',
      icon: Zap
    }
  ];

  const handleSelect = async (datasetName) => {
    const match = datasets.find((d) => d.name.toLowerCase().includes(datasetName.toLowerCase()));
    if (match) {
      await selectDataset(match.id);
    }
    if (onSelectDataset) onSelectDataset();
  };

  return (
    <>
      <section className="py-32 border-b border-[#161513]/10 bg-[#faf9f7]">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          {/* Section Index Header */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="font-mono text-xs font-semibold text-[#b5470b] tracking-wider">04</span>
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-[#9b958c]">
              GET STARTED
            </span>
          </div>

          <h2 className="font-serif font-normal text-4xl sm:text-5xl md:text-6xl text-[#161513] tracking-tight mb-4">
            Start with a story
          </h2>
          <p className="text-base text-[#6f6a62] max-w-lg mx-auto mb-16">
            Choose a sample dataset below or upload your own CSV file to explore interactive analytics instantly.
          </p>

          {/* 3 Dataset Cards Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 text-left">
            {datasetMeta.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.idKey}
                  onClick={() => handleSelect(item.name)}
                  className="gsap-reveal p-8 bg-white border border-[#161513]/12 rounded-[16px] card-shadow cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:border-[#b5470b]/50 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-[12px] bg-[#faf9f7] border border-[#161513]/10 text-[#b5470b] flex items-center justify-center group-hover:bg-[#b5470b] group-hover:text-white transition-colors">
                        <Icon className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <Badge variant="neutral">{item.rows}</Badge>
                    </div>

                    <h3 className="font-serif font-normal text-2xl text-[#161513] mb-2 group-hover:text-[#b5470b] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-sm text-[#6f6a62] leading-relaxed mb-6">
                      {item.desc}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-[#b5470b] font-semibold pt-4 border-t border-[#161513]/5">
                    <span>Load Dataset</span>
                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="max-w-2xl mx-auto">
            <div
              onClick={() => setIsUploadOpen(true)}
              className="gsap-reveal border-2 border-dashed border-[#161513]/20 hover:border-[#b5470b] rounded-[16px] p-10 bg-white card-shadow cursor-pointer transition-all duration-300 hover:bg-[#b5470b]/5 flex flex-col items-center justify-center gap-3 group"
            >
              <div className="w-12 h-12 rounded-full bg-[#faf9f7] border border-[#161513]/10 text-[#b5470b] flex items-center justify-center group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <p className="font-serif font-normal text-2xl text-[#161513] mb-1">
                  Or drop your own CSV here
                </p>
                <p className="text-xs font-mono text-[#6f6a62]">
                  Click to select file or drag onto dropzone
                </p>
              </div>
            </div>

            <p className="text-xs font-mono text-[#9b958c] mt-4">
              Supports CSV and TSV · Up to 50MB
            </p>
          </div>
        </div>
      </section>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={onSelectDataset}
      />
    </>
  );
}
