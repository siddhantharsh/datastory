import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Users, Bus, Zap, ArrowUpRight } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export function SampleShowcase({ onSelectDataset }) {
  const { datasets, selectDataset } = useDataset();

  const sampleIcons = {
    'Campus Attendance': Users,
    'City Transport': Bus,
    'Energy Consumption': Zap
  };

  const handleSelect = async (id) => {
    await selectDataset(id);
    if (onSelectDataset) onSelectDataset();
  };

  return (
    <section className="py-32 border-b border-[#1a1a1a]/10">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
          <div>
            <span className="text-xs font-semibold text-[#2563eb] uppercase tracking-wider mb-2 block">
              Pre-loaded Data Library
            </span>
            <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#1a1a1a] tracking-tight">
              Explore Sample Domain Datasets
            </h2>
          </div>
          <p className="text-sm text-[#6b6b6b] max-w-md">
            Click any sample dataset below to jump straight into the interactive chart builder and analytical tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {datasets
            .filter((d) => d.isSample)
            .map((dataset) => {
              const Icon = sampleIcons[dataset.name] || Users;
              const cols = dataset.columns || [];

              return (
                <Card key={dataset.id} hover className="gsap-reveal flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-[10px] bg-[#1a1a1a] text-white flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant="primary">{dataset.row_count || dataset.rowCount} Rows</Badge>
                    </div>

                    <h3 className="font-display font-bold text-2xl text-[#1a1a1a] mb-2">{dataset.name}</h3>
                    <p className="text-xs text-[#6b6b6b] mb-6 font-mono">
                      Spans Jan 2024 - Dec 2025 · {dataset.col_count || dataset.colCount} Attributes
                    </p>

                    <div className="space-y-2 mb-8">
                      <p className="text-xs uppercase font-semibold text-[#6b6b6b] tracking-wider">
                        Key Columns
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cols.slice(0, 5).map((col, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-[#faf9f7] border border-[#1a1a1a]/10 rounded-[6px] text-xs font-mono text-[#1a1a1a]"
                          >
                            {col}
                          </span>
                        ))}
                        {cols.length > 5 && (
                          <span className="px-2 py-1 text-xs text-[#6b6b6b]">+{cols.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-between"
                    icon={ArrowUpRight}
                    onClick={() => handleSelect(dataset.id)}
                  >
                    Open in Dashboard
                  </Button>
                </Card>
              );
            })}
        </div>
      </div>
    </section>
  );
}
