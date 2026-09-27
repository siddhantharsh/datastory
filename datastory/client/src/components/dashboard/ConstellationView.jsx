import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useDataset } from '../../context/DatasetContext';
import { formatNumberValue, formatColName } from '../../utils/smartDetector';
import { buildGraphData } from '../../utils/graphBuilder';
import { RotateCcw, Info, Sparkles } from 'lucide-react';

export function ConstellationView({ rows, meta, actIndex }) {
  const { constellationFilter, setConstellationFilter } = useDataset();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [totalNodesCount, setTotalNodesCount] = useState(0);
  const [totalValueSum, setTotalValueSum] = useState(0);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const categoricalCol = meta?.categoricalCols?.[0] || meta?.dateCol || (Object.keys(rows?.[0] || {})[0]);
  const numericCol = meta?.numericCols?.[0];
  const dateCol = meta?.dateCol;

  // Build initial graph data on dataset change
  useEffect(() => {
    if (!rows || !rows.length || !categoricalCol) return;

    const { nodes, links } = buildGraphData(rows, categoricalCol, numericCol, dateCol);
    
    // Original total unique categories before capping
    const groupedCount = new Set(rows.map(r => String(r[categoricalCol]))).size;
    setTotalNodesCount(groupedCount);

    const sumVal = nodes.reduce((acc, n) => acc + n.value, 0);
    setTotalValueSum(sumVal);

    setGraphData({ nodes, links });
  }, [rows, categoricalCol, numericCol, dateCol]);

  // Main Canvas Render & Simulation Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !graphData.nodes.length) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId = null;
    let isDragging = false;
    let dragTarget = null;
    let hoverTarget = null;
    
    // Animation timing state
    let animStartTime = null;
    const ENTRY_ANIM_DURATION = 1200; // ms

    // Deep clone nodes and links for D3 simulation to mutate safely
    const simNodes = graphData.nodes.map(n => ({
      ...n,
      x: container.clientWidth / 2 + (Math.random() - 0.5) * 20,
      y: container.clientHeight / 2 + (Math.random() - 0.5) * 20,
      animatedRadius: 0
    }));

    const simLinks = graphData.links.map(l => ({ ...l }));

    // Color Scale: amber-to-green via gray midpoint
    const colorScale = d3.scaleLinear()
      .domain([-0.5, 0, 0.5])
      .range(['#f59e0b', '#d4d4d8', '#10b981'])
      .clamp(true);

    // D3 Force Simulation Setup
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 600;

    const simulation = d3.forceSimulation(simNodes)
      .force('charge', d3.forceManyBody().strength(-320))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(d => (d.animatedRadius || d.radius) + 6))
      .alphaTarget(0.02) // Gentle continuous drift motion
      .alphaDecay(0.02);

    if (simLinks.length) {
      simulation.force('link', d3.forceLink(simLinks).id(d => d.id).distance(130).strength(d => (d.strength || 0.5) * 0.35));
    }

    // Set up canvas DPI dimensions
    const updateCanvasSize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.3).restart();
    };

    updateCanvasSize();

    // Resize Observer with debounce
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(container);

    // Easing helper
    const easeOutBack = (x) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    };

    // Render loop function
    const render = (timestamp) => {
      if (!animStartTime) animStartTime = timestamp;
      const elapsed = timestamp - animStartTime;
      const animProgress = Math.min(1, elapsed / ENTRY_ANIM_DURATION);

      // Micro drift jitter to keep simulation feeling tactile & alive
      if (!isDragging) {
        simNodes.forEach(n => {
          n.vx += (Math.random() - 0.5) * 0.05;
          n.vy += (Math.random() - 0.5) * 0.05;
        });
      }

      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Edge opacity animation factor
      const edgeFadeProgress = Math.max(0, Math.min(1, (animProgress - 0.4) / 0.6));

      // 1. Draw Edges
      if (edgeFadeProgress > 0) {
        simLinks.forEach(link => {
          if (!link.source || !link.target || isNaN(link.source.x) || isNaN(link.target.x)) return;

          const isSourceActive = hoverTarget?.id === link.source.id || String(constellationFilter) === String(link.source.id);
          const isTargetActive = hoverTarget?.id === link.target.id || String(constellationFilter) === String(link.target.id);
          const isHighlighted = isSourceActive || isTargetActive;

          let edgeOpacity = link.strength * 0.7 * edgeFadeProgress;
          if (hoverTarget || constellationFilter) {
            edgeOpacity = isHighlighted ? 0.9 * edgeFadeProgress : 0.1 * edgeFadeProgress;
          }

          ctx.beginPath();
          ctx.moveTo(link.source.x, link.source.y);
          ctx.lineTo(link.target.x, link.target.y);
          ctx.strokeStyle = isHighlighted ? `rgba(59, 130, 246, ${edgeOpacity})` : `rgba(180, 180, 180, ${edgeOpacity})`;
          ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
          ctx.stroke();
        });
      }

      // 2. Draw Nodes
      simNodes.forEach((node, idx) => {
        // Calculate animated radius growth stagger
        const staggerDelay = idx * 0.02;
        const nodeProgress = Math.max(0, Math.min(1, (animProgress * 1.4) - staggerDelay));
        const currentRadius = node.radius * easeOutBack(nodeProgress);
        node.animatedRadius = currentRadius;

        if (currentRadius <= 0.5 || isNaN(node.x) || isNaN(node.y)) return;

        const isHovered = hoverTarget && hoverTarget.id === node.id;
        const isSelected = constellationFilter && String(constellationFilter) === String(node.id);

        let nodeOpacity = 1;
        if ((hoverTarget || constellationFilter) && !isHovered && !isSelected) {
          const isConnected = simLinks.some(l => 
            (l.source.id === node.id && (l.target.id === hoverTarget?.id || String(l.target.id) === String(constellationFilter))) ||
            (l.target.id === node.id && (l.source.id === hoverTarget?.id || String(l.source.id) === String(constellationFilter)))
          );
          nodeOpacity = isConnected ? 0.85 : 0.2;
        }

        ctx.save();
        ctx.globalAlpha = nodeOpacity;

        let drawRadius = currentRadius;
        if (isHovered) {
          drawRadius = currentRadius * 1.15;
          ctx.shadowBlur = 22;
          ctx.shadowColor = 'rgba(59, 130, 246, 0.7)';
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, Math.max(1, drawRadius), 0, 2 * Math.PI);
        ctx.fillStyle = colorScale(node.relativePerformance);
        ctx.fill();

        if (isSelected) {
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = '#3b82f6';
          ctx.stroke();
        } else {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.stroke();
        }

        // Draw Label
        if (drawRadius > 22) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#161513';
          ctx.font = '600 11px Inter, system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          let label = String(node.id);
          if (label.length > 14) label = label.substring(0, 12) + '…';
          ctx.fillText(label, node.x, node.y);
        }

        ctx.restore();
      });

      ctx.restore();

      if (isVisible) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (isVisible) {
      animationFrameId = requestAnimationFrame(render);
    }

    // Hit Testing helper
    const getHitNode = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      for (let i = simNodes.length - 1; i >= 0; i--) {
        const d = simNodes[i];
        const dx = x - d.x;
        const dy = y - d.y;
        const r = (d.animatedRadius || d.radius) + 4;
        if (dx * dx + dy * dy <= r * r) {
          return d;
        }
      }
      return null;
    };

    // Attach Drag interactions using D3-drag
    const dragHandler = d3.drag()
      .container(canvas)
      .subject((e) => {
        const [x, y] = d3.pointer(e, canvas);
        for (let i = simNodes.length - 1; i >= 0; i--) {
          const d = simNodes[i];
          const dx = x - d.x;
          const dy = y - d.y;
          const r = (d.animatedRadius || d.radius) + 6;
          if (dx * dx + dy * dy <= r * r) return d;
        }
        return null;
      })
      .on('start', (e) => {
        if (!e.subject) return;
        isDragging = true;
        dragTarget = e.subject;
        if (!e.active) simulation.alphaTarget(0.3).restart();
        e.subject.fx = e.subject.x;
        e.subject.fy = e.subject.y;
        canvas.style.cursor = 'grabbing';
      })
      .on('drag', (e) => {
        if (!dragTarget) return;
        dragTarget.fx = e.x;
        dragTarget.fy = e.y;
      })
      .on('end', (e) => {
        if (!dragTarget) return;
        if (!e.active) simulation.alphaTarget(0.02);
        dragTarget.fx = null;
        dragTarget.fy = null;
        isDragging = false;
        dragTarget = null;
        canvas.style.cursor = 'pointer';
      });

    d3.select(canvas).call(dragHandler);

    // Mouse Move & Click Handlers
    const handleMouseMove = (e) => {
      if (isDragging) return;
      const hit = getHitNode(e.clientX, e.clientY);
      if (hit !== hoverTarget) {
        hoverTarget = hit;
        setHoveredNode(hit);
        canvas.style.cursor = hit ? 'pointer' : 'default';
      }
    };

    const handleMouseLeave = () => {
      if (isDragging) return;
      hoverTarget = null;
      setHoveredNode(null);
      canvas.style.cursor = 'default';
    };

    let clickTimer = null;
    const handleClick = (e) => {
      if (isDragging) return;
      const hit = getHitNode(e.clientX, e.clientY);
      if (hit) {
        setConstellationFilter(prev => String(prev) === String(hit.id) ? null : hit.id);
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('click', handleClick);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      simulation.stop();
      resizeObserver.disconnect();
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, [graphData, isVisible, constellationFilter]);

  // Intersection Observer to pause physics when scrolled off-screen
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { threshold: 0.1 });
    
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const edgeCount = graphData.links.length;

  const activeNode = hoveredNode || graphData.nodes.find(n => String(n.id) === String(constellationFilter));

  return (
    <section
      data-slide-index={actIndex}
      className="dashboard-slide min-h-[90vh] flex flex-col justify-center pt-8 border-t border-[#161513]/10 transition-all duration-700 ease-out transform"
      ref={containerRef}
    >
      <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[#b5470b] mb-4">
        {String(actIndex).padStart(2, '0')} · THE MAP
      </div>

      <h2 className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-[#161513] leading-tight mb-2 max-w-5xl">
        Click a node to zoom into its story.
      </h2>

      <p className="font-mono text-[13px] text-[#6f6a62] max-w-4xl mb-6">
        {graphData.nodes.length} {formatColName(categoricalCol)} values, sized by {formatColName(numericCol || 'records')}. 
        {edgeCount > 0 ? ' Lines connect ones that move together.' : ''}
      </p>

      {/* Main Canvas Container */}
      <div className="relative w-full h-[620px] bg-[#faf9f7] border border-[#161513]/10 rounded-[24px] shadow-sm overflow-hidden flex flex-col">
        
        <canvas ref={canvasRef} className="w-full h-full flex-1 block cursor-grab active:cursor-grabbing" />
        
        {/* Floating Info Card for Hovered or Selected Node */}
        {activeNode && (
          <div className="absolute top-4 left-4 min-w-[220px] max-w-[280px] pointer-events-none transition-all duration-200">
            <div className="bg-white/95 backdrop-blur-md border border-[#161513]/12 shadow-xl rounded-[16px] p-4 font-sans text-[#161513]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#b5470b] font-semibold">
                  {formatColName(categoricalCol)}
                </span>
                {String(constellationFilter) === String(activeNode.id) && (
                  <span className="bg-[#b5470b] text-white text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">
                    Active Filter
                  </span>
                )}
              </div>

              <div className="font-bold text-base text-[#161513] mb-3 leading-snug truncate">
                {activeNode.id}
              </div>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center text-[#6f6a62]">
                  <span>Total {formatColName(numericCol || 'Value')}</span>
                  <span className="font-bold text-[#161513]">
                    {formatNumberValue(activeNode.value)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#6f6a62]">
                  <span>Avg per Record</span>
                  <span className="font-semibold text-[#161513]">
                    {activeNode.rowCount ? formatNumberValue(activeNode.value / activeNode.rowCount) : '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[#6f6a62]">
                  <span>Record Count</span>
                  <span className="font-semibold text-[#161513]">
                    {activeNode.rowCount.toLocaleString()}
                  </span>
                </div>

                {totalValueSum > 0 && (
                  <div className="flex justify-between items-center text-[#6f6a62]">
                    <span>Share of Overall</span>
                    <span className="font-semibold text-[#161513]">
                      {((activeNode.value / totalValueSum) * 100).toFixed(1)}%
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-[#161513]/8 mt-1">
                  <span className="text-[#6f6a62]">vs Avg Performance</span>
                  <span className={`font-bold ${activeNode.relativePerformance >= 0 ? 'text-[#10b981]' : 'text-[#b5470b]'}`}>
                    {activeNode.relativePerformance >= 0 ? '+' : ''}{(activeNode.relativePerformance * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top-Right Capping Safeguard Banner */}
        {totalNodesCount > 60 && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur border border-[#f59e0b]/40 text-[#b5470b] font-mono text-[11px] px-3.5 py-1.5 rounded-full shadow-sm pointer-events-none flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />
            Showing top 60 of {totalNodesCount} — filter first for a fuller map
          </div>
        )}

        {/* Bottom Toolbar & Legend */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-white/90 backdrop-blur-md border-t border-[#161513]/10 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-6 font-mono text-[11px] uppercase text-[#6f6a62] tracking-wider">
             <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 rounded-full bg-[#161513]/30" />
               <span>Size = Total {formatColName(numericCol || 'Records')}</span>
             </div>
             
             <div className="flex items-center gap-2">
               <div className="w-16 h-2 rounded-full bg-gradient-to-r from-[#f59e0b] via-[#d4d4d8] to-[#10b981]" />
               <span>Perf vs Avg</span>
             </div>

             {edgeCount > 0 && (
               <div className="flex items-center gap-2">
                 <div className="w-5 h-0.5 bg-[#3b82f6]" />
                 <span>Correlated Time Series</span>
               </div>
             )}
          </div>
          
          <button 
            onClick={() => setConstellationFilter(null)}
            className={`flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full transition-all ${
              constellationFilter 
                ? 'bg-[#161513] text-white hover:bg-[#b5470b] shadow-sm' 
                : 'text-[#9b958c] hover:bg-[#161513]/5'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset View</span>
          </button>
        </div>
      </div>
    </section>
  );
}
