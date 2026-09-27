import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useDataset } from '../../context/DatasetContext';
import { formatNumberValue, formatColName } from '../../utils/smartDetector';
import {
  getCategoryColorMap,
  layoutCluster,
  layoutTimeline,
  layoutRank,
  layoutGrid,
} from '../../utils/formations';
import { Share2, Calendar, BarChart2, LayoutGrid, RotateCcw, Info } from 'lucide-react';

export function ParticleSwarm({ rows, meta, actIndex }) {
  const { constellationFilter, setConstellationFilter } = useDataset();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [activeFormation, setActiveFormation] = useState('cluster'); // 'cluster' | 'timeline' | 'rank' | 'grid'
  const [hoveredParticle, setHoveredParticle] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [narrativeText, setNarrativeText] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  const categoricalCol = meta?.categoricalCols?.[0] || meta?.dateCol || Object.keys(rows?.[0] || {})[0];
  const numericCol = meta?.numericCols?.[0];
  const dateCol = meta?.dateCol;

  // Cap dataset display rows to 500 max for canvas swarm
  const displayRows = useMemo(() => {
    if (!rows || !rows.length) return [];
    return rows.length > 500 ? rows.slice(0, 500) : rows;
  }, [rows]);

  // Unique categories & Color Mapping
  const categories = useMemo(() => {
    if (!displayRows.length || !categoricalCol) return [];
    return Array.from(new Set(displayRows.map(r => String(r[categoricalCol] ?? 'Other'))));
  }, [displayRows, categoricalCol]);

  const colorMap = useMemo(() => getCategoryColorMap(categories), [categories]);

  // Particle Objects State Persistent Ref
  const particlesRef = useRef([]);
  const layoutMetaRef = useRef({});
  const hasAnimatedInRef = useRef(false);

  // Initialize Particles when rows/cols change
  useEffect(() => {
    if (!displayRows.length || !categoricalCol) return;

    particlesRef.current = displayRows.map((r, idx) => {
      const cat = String(r[categoricalCol] ?? 'Other');
      const val = numericCol && !isNaN(Number(r[numericCol])) ? Number(r[numericCol]) : 1;
      const d = dateCol ? r[dateCol] : null;

      return {
        id: idx,
        row: r,
        x: (Math.random() * 0.8 + 0.1) * 800,
        y: (Math.random() * 0.8 + 0.1) * 600,
        targetX: 400,
        targetY: 300,
        radius: hasAnimatedInRef.current ? 5 : 0,
        targetRadius: 5,
        opacity: hasAnimatedInRef.current ? 1 : 0,
        color: colorMap[cat] || '#3b82f6',
        category: cat,
        value: val,
        date: d,
      };
    });
  }, [displayRows, categoricalCol, numericCol, dateCol, colorMap]);

  // Main Canvas & Layout Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !particlesRef.current.length) return;

    const ctx = canvas.getContext('2d');
    let animFrameId = null;
    let entryStartTime = null;

    const updateLayout = () => {
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;

      let res = { narrative: '' };
      if (activeFormation === 'cluster') {
        res = layoutCluster(particlesRef.current, categoricalCol, numericCol, width, height);
      } else if (activeFormation === 'timeline') {
        res = layoutTimeline(particlesRef.current, dateCol, numericCol, categoricalCol, width, height);
      } else if (activeFormation === 'rank') {
        res = layoutRank(particlesRef.current, numericCol, categoricalCol, width, height);
      } else if (activeFormation === 'grid') {
        res = layoutGrid(particlesRef.current, categoricalCol, width, height);
      }

      layoutMetaRef.current = res;
      setNarrativeText(res.narrative || '');
    };

    const updateCanvasSize = () => {
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      updateLayout();
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(() => updateCanvasSize());
    resizeObserver.observe(container);

    // Render loop
    const render = (timestamp) => {
      if (!entryStartTime) entryStartTime = timestamp;
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 600;
      const dpr = window.devicePixelRatio || 1;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Entry animation logic
      if (!hasAnimatedInRef.current && isVisible) {
        const elapsed = timestamp - entryStartTime;
        particlesRef.current.forEach((p, idx) => {
          const delay = idx * 2; // 2ms stagger wave
          const progress = Math.max(0, Math.min(1, (elapsed - delay) / 800));
          p.radius = progress * p.targetRadius;
          p.opacity = progress;
        });
        if (elapsed > 1800) {
          hasAnimatedInRef.current = true;
        }
      }

      // 1. Draw Background Axes / Gridlines based on active formation
      if (activeFormation === 'timeline' && layoutMetaRef.current.axes) {
        const { padding, minDate, maxDate, minVal, maxVal, plotW, plotH } = layoutMetaRef.current.axes;
        ctx.strokeStyle = 'rgba(22, 21, 19, 0.08)';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#9b958c';
        ctx.font = '10px monospace';

        // Horizontal Value Grid lines (4 ticks)
        for (let i = 0; i <= 4; i++) {
          const y = padding.top + (i / 4) * plotH;
          const val = maxVal - (i / 4) * (maxVal - minVal);
          ctx.beginPath();
          ctx.moveTo(padding.left, y);
          ctx.lineTo(width - padding.right, y);
          ctx.stroke();

          ctx.textAlign = 'right';
          ctx.fillText(formatNumberValue(val), padding.left - 8, y + 3);
        }

        // Vertical Date Grid lines (4 ticks)
        for (let i = 0; i <= 4; i++) {
          const x = padding.left + (i / 4) * plotW;
          const t = minDate + (i / 4) * (maxDate - minDate);
          const dateStr = new Date(t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          ctx.beginPath();
          ctx.moveTo(x, padding.top);
          ctx.lineTo(x, height - padding.bottom);
          ctx.stroke();

          ctx.textAlign = 'center';
          ctx.fillText(dateStr, x, height - padding.bottom + 18);
        }
      } else if (activeFormation === 'rank' && layoutMetaRef.current.barLeft) {
        const { barLeft, barAreaWidth } = layoutMetaRef.current;
        ctx.strokeStyle = 'rgba(22, 21, 19, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(barLeft, 40);
        ctx.lineTo(barLeft, height - 40);
        ctx.stroke();
      }

      // 2. Physics Easing Step & Draw Particles
      let allSettled = true;
      particlesRef.current.forEach((p) => {
        // Smooth easing toward target
        p.x = Math.max(p.radius, Math.min(width - p.radius, p.x + (p.targetX - p.x) * 0.08));
        p.y = Math.max(p.radius, Math.min(height - p.radius, p.y + (p.targetY - p.y) * 0.08));

        if (Math.abs(p.targetX - p.x) > 0.4 || Math.abs(p.targetY - p.y) > 0.4) {
          allSettled = false;
        }

        const isHovered = hoveredParticle && hoveredParticle.id === p.id;
        const isSelectedCat = constellationFilter && String(constellationFilter) === String(p.category);
        const isHoveredCat = hoveredParticle && String(hoveredParticle.category) === String(p.category);

        let opacity = p.opacity;
        if (constellationFilter) {
          opacity = isSelectedCat ? 1 : 0.15;
        } else if (hoveredParticle) {
          opacity = isHoveredCat ? 1 : 0.2;
        }

        ctx.save();
        ctx.globalAlpha = opacity;

        let drawRadius = p.radius;
        if (isHovered) {
          drawRadius = 12;
          ctx.shadowBlur = 16;
          ctx.shadowColor = p.color;
        } else if (isSelectedCat) {
          drawRadius = p.radius * 1.2;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, drawRadius), 0, 2 * Math.PI);
        ctx.fillStyle = p.color;
        ctx.fill();

        if (isHovered || isSelectedCat) {
          ctx.lineWidth = isHovered ? 2.5 : 1.5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }

        ctx.restore();
      });

      // 3. Draw Cluster Titles on Canvas
      if (activeFormation === 'cluster' && layoutMetaRef.current.labels) {
        layoutMetaRef.current.labels.forEach((lbl) => {
          ctx.fillStyle = '#161513';
          ctx.font = '600 12px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(lbl.name, lbl.x, Math.max(30, lbl.y));

          ctx.fillStyle = '#9b958c';
          ctx.font = '10px monospace';
          ctx.fillText(`${lbl.count} records`, lbl.x, Math.max(44, lbl.y + 14));
        });
      }

      ctx.restore();

      if (isVisible) {
        animFrameId = requestAnimationFrame(render);
      }
    };

    if (isVisible) {
      animFrameId = requestAnimationFrame(render);
    }

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
    };
  }, [activeFormation, isVisible, constellationFilter, hoveredParticle]);

  // Intersection Observer for performance
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { threshold: 0.1 });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Hit-Testing Mouse Handlers
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

    let found = null;
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      const dx = x - p.x;
      const dy = y - p.y;
      const hitR = Math.max(8, p.radius + 4);
      if (dx * dx + dy * dy <= hitR * hitR) {
        found = p;
        break;
      }
    }

    if (found !== hoveredParticle) {
      setHoveredParticle(found);
      canvas.style.cursor = found ? 'pointer' : 'default';
    }
  };

  const handleMouseLeave = () => {
    setHoveredParticle(null);
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  };

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found = null;
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      const dx = x - p.x;
      const dy = y - p.y;
      const hitR = Math.max(8, p.radius + 4);
      if (dx * dx + dy * dy <= hitR * hitR) {
        found = p;
        break;
      }
    }

    if (found) {
      setConstellationFilter(prev => String(prev) === String(found.category) ? null : found.category);
    } else {
      setConstellationFilter(null);
    }
  };

  return (
    <section
      data-slide-index={actIndex}
      className="dashboard-slide min-h-[90vh] flex flex-col justify-center pt-8 border-t border-[#161513]/10 transition-all duration-700 ease-out transform"
      ref={containerRef}
    >
      {/* SECTION LABEL & HEADING */}
      <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[#b5470b] mb-4">
        {String(actIndex).padStart(2, '0')} · THE MAP
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-[#161513] leading-tight mb-2 max-w-5xl">
            See every record at once.
          </h2>
          <p className="font-mono text-[13px] text-[#6f6a62] max-w-3xl">
            {narrativeText || `Each dot is one record. Switch views to transform spatial arrangements.`}
          </p>
        </div>

        {/* TOOLBAR TOGGLE GROUP */}
        <div className="bg-[#161513]/5 p-1 rounded-full border border-[#161513]/10 flex items-center gap-1 self-start md:self-auto shrink-0 shadow-inner">
          <button
            onClick={() => setActiveFormation('cluster')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
              activeFormation === 'cluster'
                ? 'bg-[#161513] text-white shadow-sm'
                : 'text-[#6f6a62] hover:text-[#161513] hover:bg-white/60'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Cluster</span>
          </button>

          <button
            disabled={!dateCol}
            onClick={() => dateCol && setActiveFormation('timeline')}
            title={!dateCol ? 'Needs a date column' : 'Timeline scatter view'}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
              activeFormation === 'timeline'
                ? 'bg-[#161513] text-white shadow-sm'
                : !dateCol
                ? 'opacity-40 cursor-not-allowed text-[#9b958c]'
                : 'text-[#6f6a62] hover:text-[#161513] hover:bg-white/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => setActiveFormation('rank')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
              activeFormation === 'rank'
                ? 'bg-[#161513] text-white shadow-sm'
                : 'text-[#6f6a62] hover:text-[#161513] hover:bg-white/60'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Rank</span>
          </button>

          <button
            onClick={() => setActiveFormation('grid')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
              activeFormation === 'grid'
                ? 'bg-[#161513] text-white shadow-sm'
                : 'text-[#6f6a62] hover:text-[#161513] hover:bg-white/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* MAIN CANVAS CONTAINER */}
      <div className="relative w-full h-[620px] bg-[#faf9f7] border border-[#161513]/10 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="w-full h-full flex-1 block"
        />

        {/* FLOATING HOVER TOOLTIP CARD */}
        {hoveredParticle && (
          <div
            className="fixed z-50 pointer-events-none transition-all duration-150 transform -translate-x-1/2 -translate-y-full mb-3"
            style={{ left: mousePos.x, top: mousePos.y }}
          >
            <div className="bg-[#161513] text-white shadow-2xl border border-white/20 rounded-[14px] p-3.5 min-w-[200px] max-w-[280px] font-sans text-xs">
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-[#f59e0b]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredParticle.color }} />
                  <span className="truncate">{hoveredParticle.category}</span>
                </div>
                <span className="font-mono text-[9px] text-white/50">Row #{hoveredParticle.id + 1}</span>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                {numericCol && (
                  <div className="flex justify-between gap-3 text-white/80">
                    <span className="text-white/50">{formatColName(numericCol)}</span>
                    <span className="font-bold text-white">{formatNumberValue(hoveredParticle.value)}</span>
                  </div>
                )}
                {dateCol && (
                  <div className="flex justify-between gap-3 text-white/80">
                    <span className="text-white/50">{formatColName(dateCol)}</span>
                    <span className="font-semibold text-white">
                      {hoveredParticle.date ? new Date(hoveredParticle.date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                )}

                {/* Additional preview key-values */}
                {Object.entries(hoveredParticle.row || {})
                  .filter(([k]) => k !== categoricalCol && k !== numericCol && k !== dateCol)
                  .slice(0, 3)
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 text-white/70 text-[10px] truncate">
                      <span className="text-white/40 truncate">{formatColName(k)}</span>
                      <span className="font-medium truncate text-white/90">{String(v)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM LEGEND & RESET BAR */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-white/90 backdrop-blur-md border-t border-[#161513]/10 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-5 overflow-x-auto py-1 scrollbar-none font-mono text-[11px] uppercase text-[#6f6a62]">
            <span className="text-[#161513] font-semibold">{displayRows.length} Particles</span>
            <span className="text-[#161513]/20">|</span>
            <div className="flex items-center gap-3">
              {categories.slice(0, 6).map((cat) => (
                <div
                  key={cat}
                  onClick={() => setConstellationFilter(prev => String(prev) === String(cat) ? null : cat)}
                  className={`flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded transition-all ${
                    String(constellationFilter) === String(cat)
                      ? 'bg-[#161513] text-white font-bold'
                      : 'hover:bg-[#161513]/5'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorMap[cat] }} />
                  <span className="truncate max-w-[90px]">{cat}</span>
                </div>
              ))}
              {categories.length > 6 && (
                <span className="text-[#9b958c] text-[10px]">+{categories.length - 6} more</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setConstellationFilter(null)}
            className={`flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all shrink-0 ${
              constellationFilter
                ? 'bg-[#161513] text-white hover:bg-[#b5470b] shadow-sm'
                : 'text-[#9b958c] hover:bg-[#161513]/5'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filter</span>
          </button>
        </div>
      </div>
    </section>
  );
}
