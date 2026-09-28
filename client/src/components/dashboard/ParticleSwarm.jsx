import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useDataset } from '../../context/DatasetContext';
import { formatNumberValue, formatColName } from '../../utils/smartDetector';
import { parseNumericValue, parseDateValue } from '../../utils/csvHelpers';
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

  // Cap dataset display rows to 500 max for canvas swarm. Sampled with an
  // even stride across the full range (not just a prefix slice) so a large
  // chronologically-ordered dataset isn't visually biased toward only its
  // earliest 500 rows.
  const displayRows = useMemo(() => {
    if (!rows || !rows.length) return [];
    if (rows.length <= 500) return rows;
    const step = rows.length / 500;
    const sampled = [];
    for (let i = 0; i < 500; i++) {
      sampled.push(rows[Math.floor(i * step)]);
    }
    return sampled;
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
      const parsedVal = numericCol ? parseNumericValue(r[numericCol]) : NaN;
      const val = !isNaN(parsedVal) ? parsedVal : 1;
      const d = dateCol ? r[dateCol] : null;
      // Pre-parsed once here (using the column's resolved dateFormat) so the
      // Timeline formation and the hover tooltip don't each re-parse the raw
      // value with a bare new Date(), which silently mis-sorts or drops
      // non-ISO/US dates (e.g. DD/MM/YYYY with day > 12).
      const parsedDate = dateCol ? parseDateValue(d, meta?.dateFormat) : null;

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
        dateMs: parsedDate ? parsedDate.getTime() : NaN,
      };
    });
  }, [displayRows, categoricalCol, numericCol, dateCol, colorMap, meta?.dateFormat]);

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

  // Hit-Testing (shared by mouse and touch input)
  const hitTest = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      const dx = x - p.x;
      const dy = y - p.y;
      const hitR = Math.max(8, p.radius + 4);
      if (dx * dx + dy * dy <= hitR * hitR) {
        return p;
      }
    }
    return null;
  };

  const applyFilterFor = (found) => {
    if (found) {
      setConstellationFilter(prev => String(prev) === String(found.category) ? null : found.category);
    } else {
      setConstellationFilter(null);
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setMousePos({ x: e.clientX, y: e.clientY });
    const found = hitTest(e.clientX, e.clientY);

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
    applyFilterFor(hitTest(e.clientX, e.clientY));
  };

  // Touch support: canvas previously only responded to mouse events, so it
  // was entirely non-interactive on phones/tablets (no hover state exists on
  // touch, and tap alone still fires a click, but with zero visual feedback
  // telling the user anything was tappable). A tap here shows the tooltip and
  // applies the filter together; a drag/swipe (used to scroll the page past
  // this section) is left alone by checking movement between start and end.
  const TAP_MOVE_THRESHOLD = 10;
  const touchStartRef = useRef({ x: 0, y: 0, moved: false });

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY, moved: false };
  };

  const handleTouchMove = (e) => {
    const t = e.touches[0];
    if (!t) return;
    const { x, y } = touchStartRef.current;
    if (Math.abs(t.clientX - x) > TAP_MOVE_THRESHOLD || Math.abs(t.clientY - y) > TAP_MOVE_THRESHOLD) {
      touchStartRef.current.moved = true;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartRef.current.moved) return;
    const { x, y } = touchStartRef.current;
    const found = hitTest(x, y);
    setMousePos({ x, y });
    setHoveredParticle(found);
    applyFilterFor(found);
  };

  return (
    <section
      data-slide-index={actIndex}
      className="dashboard-slide min-h-[90dvh] flex flex-col justify-center pt-8 border-t border-[var(--ink)]/10 transition-all duration-300 ease-out transform"
      ref={containerRef}
    >
      {/* SECTION LABEL & HEADING */}
      <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[#b5470b] mb-4">
        {String(actIndex).padStart(2, '0')} · THE MAP
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-[var(--ink)] leading-tight mb-2 max-w-5xl">
            See every record at once.
          </h2>
          <p className="font-mono text-[13px] text-[var(--muted)] max-w-3xl">
            {narrativeText || `Each dot is one record. Switch views to transform spatial arrangements.`}
          </p>
          <p className="font-mono text-[11px] text-[var(--muted-2)] flex items-center gap-1.5 mt-1.5">
            <Info className="w-3 h-3 shrink-0" />
            <span>Click or tap any point to filter the story below.</span>
          </p>
        </div>

        {/* TOOLBAR TOGGLE GROUP */}
        <div className="print:hidden bg-[var(--ink)]/5 p-1 rounded-full border border-[var(--ink)]/10 flex items-center gap-1 self-start md:self-auto shrink-0 shadow-inner">
          <button
            onClick={() => setActiveFormation('cluster')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
              activeFormation === 'cluster'
                ? 'bg-[#161513] text-white shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-white/60'
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
                ? 'opacity-40 cursor-not-allowed text-[var(--muted-2)]'
                : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-white/60'
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
                : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-white/60'
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
                : 'text-[var(--muted)] hover:text-[var(--ink)] hover:bg-white/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* MAIN CANVAS CONTAINER */}
      <div className="relative w-full h-[620px] bg-[var(--bg)] border border-[var(--ink)]/10 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full flex-1 block touch-pan-y"
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
                      {!isNaN(hoveredParticle.dateMs) ? new Date(hoveredParticle.dateMs).toLocaleDateString() : 'N/A'}
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
        <div className="print:hidden absolute bottom-0 left-0 right-0 h-12 bg-white/90 backdrop-blur-md border-t border-[var(--ink)]/10 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-5 overflow-x-auto py-1 scrollbar-none font-mono text-[11px] uppercase text-[var(--muted)]">
            <span className="text-[var(--ink)] font-semibold">{displayRows.length} Particles</span>
            <span className="text-[var(--ink)]/20">|</span>
            <div className="flex items-center gap-3">
              {categories.slice(0, 6).map((cat) => (
                <div
                  key={cat}
                  onClick={() => setConstellationFilter(prev => String(prev) === String(cat) ? null : cat)}
                  className={`flex items-center gap-1.5 cursor-pointer px-2 py-0.5 rounded transition-all ${
                    String(constellationFilter) === String(cat)
                      ? 'bg-[#161513] text-white font-bold'
                      : 'hover:bg-[var(--ink)]/5'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorMap[cat] }} />
                  <span className="truncate max-w-[90px]">{cat}</span>
                </div>
              ))}
              {categories.length > 6 && (
                <span className="text-[var(--muted-2)] text-[10px]">+{categories.length - 6} more</span>
              )}
            </div>
          </div>

          <button
            onClick={() => setConstellationFilter(null)}
            className={`flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all shrink-0 ${
              constellationFilter
                ? 'bg-[#161513] text-white hover:bg-[#b5470b] shadow-sm'
                : 'text-[var(--muted-2)] hover:bg-[var(--ink)]/5'
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
