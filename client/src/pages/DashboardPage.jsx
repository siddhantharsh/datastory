import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DatasetHeader } from '../components/dashboard/DatasetHeader';
import { FilterBar } from '../components/dashboard/FilterBar';
import { KPICards } from '../components/dashboard/KPICards';
import { ChartBuilder } from '../components/dashboard/ChartBuilder';
import { DataTableExplorer } from '../components/dashboard/DataTableExplorer';
import { AnalyticsSummary } from '../components/dashboard/AnalyticsSummary';
import { ActTrendChart } from '../components/dashboard/ActTrendChart';
import { ActBreakdownChart } from '../components/dashboard/ActBreakdownChart';
import { ActComparisonChart } from '../components/dashboard/ActComparisonChart';
import { ActStandoutsTables } from '../components/dashboard/ActStandoutsTables';
import { ParticleSwarm } from '../components/dashboard/ParticleSwarm';

import { useDataset } from '../context/DatasetContext';
import { generateSmartDashboardConfig, formatColName } from '../utils/smartDetector';
import { generateStory } from '../utils/storyGenerator';
import { parseNumericValue, parseDateValue } from '../utils/csvHelpers';

import { Sliders, CheckSquare, Square, Sparkles, ChevronLeft, ChevronRight, Hash, Calendar, Tag, Type, ArrowDown } from 'lucide-react';

export function DashboardPage({ onBackToHome }) {
  const { activeDataset, loading, error, constellationFilter, setConstellationFilter, selectDataset } = useDataset();

  // Active Slide Tracker (1 to 7)
  const [activeSlide, setActiveSlide] = useState(1);
  const [visibleSlides, setVisibleSlides] = useState(new Set([1]));

  // Collapsible Sidebar State for Act 6
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Filters State for Act 6
  const [filters, setFilters] = useState({
    categorical: {},
    numeric: {},
    dateRange: { start: '', end: '' }
  });

  // Visible Columns State for Act 6 (Attribute Filter)
  const [visibleColumns, setVisibleColumns] = useState([]);

  // Manual column-type overrides (Act 7 sidebar) — lets a user correct
  // auto-detection when it gets a column wrong, rather than being stuck
  // with whatever the heuristic decided.
  const [typeOverrides, setTypeOverrides] = useState({});
  const TYPE_CYCLE = ['numeric', 'categorical', 'date', 'high_cardinality'];
  const cycleColumnType = (col, currentType) => {
    const idx = TYPE_CYCLE.indexOf(currentType);
    const nextType = TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length];
    setTypeOverrides((prev) => ({ ...prev, [col]: nextType }));
  };
  const resetTypeOverrides = () => setTypeOverrides({});

  // Shareable/permalink view: a ?dataset=<id>&state=<json> URL restores the
  // same dataset + filters + visible columns + type overrides. Read once on
  // mount; the actual restore happens in the dataset-change effect below
  // (once activeDataset has caught up to the URL's dataset id), so it isn't
  // clobbered by that effect's own reset-to-defaults behavior.
  const pendingUrlStateRef = useRef(null);
  const urlHydratedRef = useRef(false);
  const targetDatasetIdRef = useRef(null);

  useEffect(() => {
    if (urlHydratedRef.current) return;
    urlHydratedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const stateParam = params.get('state');

    if (stateParam) {
      try {
        pendingUrlStateRef.current = JSON.parse(stateParam);
      } catch {
        // Malformed/tampered state param — ignore, fall back to defaults.
      }
    }

    targetDatasetIdRef.current = params.get('dataset');
  }, []);

  // DatasetContext auto-selects the first dataset on its own load, which
  // races with the URL's requested dataset (both are async fetches with
  // unpredictable ordering) — re-assert the target on every activeDataset
  // change until it actually matches, rather than a one-shot mount call.
  useEffect(() => {
    const targetId = targetDatasetIdRef.current;
    if (targetId && activeDataset?.id !== targetId) {
      selectDataset(targetId);
    }
  }, [activeDataset?.id]);

  // Keep the URL in sync with the current view so it can be shared/bookmarked.
  useEffect(() => {
    if (!activeDataset?.id) return;
    const params = new URLSearchParams();
    params.set('dataset', activeDataset.id);
    params.set('state', JSON.stringify({ filters, visibleColumns, typeOverrides }));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [activeDataset?.id, filters, visibleColumns, typeOverrides]);

  // Scroll to top resting on Slide 1 on mount or dataset load
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeDataset?.id]);

  // Native CSS scroll-snap for Acts 1-6 (see index.css's html.snap-scroll-active
  // rule) — scoped to this page only via a class toggled on mount/unmount,
  // since scroll-snap-type lives on the scroll container (html/body), which
  // is shared with the landing page.
  useEffect(() => {
    document.documentElement.classList.add('snap-scroll-active');
    return () => document.documentElement.classList.remove('snap-scroll-active');
  }, []);

  // Auto-generate smart dashboard configuration when dataset changes
  const config = useMemo(() => {
    if (!activeDataset || !activeDataset.rows || !activeDataset.rows.length) {
      return null;
    }
    const cols = activeDataset.columns || Object.keys(activeDataset.rows[0]);
    return generateSmartDashboardConfig(activeDataset.rows, cols, typeOverrides);
  }, [activeDataset, typeOverrides]);

  // Filter rows based on constellation map selection for Acts 3+
  const constellationRows = useMemo(() => {
    if (!activeDataset || !activeDataset.rows) return [];
    if (!constellationFilter || !config?.meta) return activeDataset.rows;
    const catCol = config.meta.categoricalCols?.[0] || config.meta.dateCol || Object.keys(activeDataset.rows[0]||{})[0];
    return activeDataset.rows.filter(r => String(r[catCol]) === String(constellationFilter));
  }, [activeDataset, constellationFilter, config]);

  // Generate Narrative Story (Acts 1 to 5... now 6)
  const story = useMemo(() => {
    if (!activeDataset || !activeDataset.rows || !config?.meta) return null;
    return generateStory(constellationRows, config.meta);
  }, [constellationRows, config, activeDataset]);

  // Reset filters and column selector when dataset changes — or, if a
  // shareable-URL restore is pending for this exact dataset, apply that
  // instead of the defaults.
  useEffect(() => {
    if (activeDataset && activeDataset.columns) {
      const cols = activeDataset.columns || Object.keys(activeDataset.rows[0] || {});
      const pending = pendingUrlStateRef.current;
      pendingUrlStateRef.current = null;

      setVisibleColumns(pending?.visibleColumns?.length ? pending.visibleColumns : cols);
      setFilters(
        pending?.filters || {
          categorical: {},
          numeric: {},
          dateRange: { start: '', end: '' }
        }
      );
      setTypeOverrides(pending?.typeOverrides || {});
    }
  }, [activeDataset?.id]);

  // Track active slide and animate scroll entrance/exit (Up and Down)
  useEffect(() => {
    const handleObserver = (entries) => {
      entries.forEach((entry) => {
        const slideNum = Number(entry.target.getAttribute('data-slide-index'));
        if (entry.isIntersecting) {
          if (slideNum) setActiveSlide(slideNum);
          setVisibleSlides((prev) => new Set([...prev, slideNum]));
        } else {
          // Mirror the reveal on the way back out too — otherwise scrolling
          // back up shows only already-settled sections while scrolling down
          // triggers the animation exactly once, an asymmetry that reads as
          // scroll feeling "wrong."
          setVisibleSlides((prev) => {
            if (!prev.has(slideNum)) return prev;
            const next = new Set(prev);
            next.delete(slideNum);
            return next;
          });
        }
      });
    };

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.25
    });

    const slides = document.querySelectorAll('.dashboard-slide');
    slides.forEach((slide) => observer.observe(slide));

    return () => observer.disconnect();
  }, [story, activeDataset]);

  // Filter dataset rows based on active filter controls in Act 7
  const filteredRows = useMemo(() => {
    if (!constellationRows) return [];
    let rows = constellationRows;

    // 1. Categorical Multi-Select Filter
    if (filters.categorical && Object.keys(filters.categorical).length > 0) {
      Object.entries(filters.categorical).forEach(([col, selectedVals]) => {
        if (selectedVals && selectedVals.length > 0) {
          rows = rows.filter((r) => {
            const val = r[col];
            if (val === undefined || val === null || val === '') return false;
            const strVal = String(val).trim();
            return selectedVals.includes(strVal);
          });
        }
      });
    }

    // 2. Numeric Range Filter (Min-Max)
    if (filters.numeric && Object.keys(filters.numeric).length > 0) {
      Object.entries(filters.numeric).forEach(([col, range]) => {
        const [min, max] = range || [];
        if (min !== null && min !== undefined && !isNaN(min)) {
          rows = rows.filter((r) => parseNumericValue(r[col]) >= Number(min));
        }
        if (max !== null && max !== undefined && !isNaN(max)) {
          rows = rows.filter((r) => parseNumericValue(r[col]) <= Number(max));
        }
      });
    }

    // 3. Date Range Filter
    if (filters.dateRange?.start || filters.dateRange?.end) {
      const { start, end } = filters.dateRange;
      const dateCol = config?.meta?.dateCol;
      const dateFormat = config?.meta?.dateFormat;

      if (dateCol) {
        if (start) {
          const startDate = new Date(start);
          rows = rows.filter((r) => {
            const d = parseDateValue(r[dateCol], dateFormat);
            return d && d >= startDate;
          });
        }
        if (end) {
          const endDate = new Date(end + 'T23:59:59');
          rows = rows.filter((r) => {
            const d = parseDateValue(r[dateCol], dateFormat);
            return d && d <= endDate;
          });
        }
      }
    }

    return rows;
  }, [constellationRows, filters, config]);

  // Toggle visible column in sidebar selector (Attribute Filter)
  const toggleColumnVisibility = (col) => {
    setVisibleColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const clearAllFilters = () => {
    setFilters({
      categorical: {},
      numeric: {},
      dateRange: { start: '', end: '' }
    });
  };

  if (loading && !activeDataset) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] pt-24 pb-16 px-6 transition-colors font-sans">
        <div className="max-w-[1280px] mx-auto flex flex-col items-center justify-center py-32">
          <div className="w-12 h-12 border-4 border-[#b5470b] border-t-transparent rounded-full animate-spin mb-6" />
          <h2 className="font-serif text-3xl mb-2">Generating Data Narrative...</h2>
          <p className="font-mono text-xs text-[var(--muted)]">
            Synthesizing metrics, calculating correlation matrices, and staging slideshow narrative
          </p>
        </div>
      </div>
    );
  }

  if (error || !activeDataset) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] pt-24 pb-16 px-6 transition-colors font-sans">
        <div className="max-w-[1280px] mx-auto py-16">
          <div className="p-8 bg-red-50 border border-red-200 rounded-[20px] text-red-800">
            <h3 className="font-serif font-bold text-2xl mb-1">Dataset Load Error</h3>
            <p className="text-xs font-mono">{error || 'No active dataset selected.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const allColumns = activeDataset.columns || Object.keys(activeDataset.rows[0] || {});
  const displayColumns = visibleColumns.length > 0 ? visibleColumns : allColumns;

  // Top slide nav: only lists Acts that actually rendered for this dataset
  // (e.g. no date column means no Act 3 "Trend" section) — clicking a dead
  // button for a section that doesn't exist would be its own confusing bug.
  const actNavItems = [
    { num: 1, label: 'Glance', show: Boolean(story?.overview) },
    { num: 2, label: 'Map', show: Boolean(config?.meta) },
    { num: 3, label: 'Trend', show: Boolean(story?.trend) },
    { num: 4, label: 'Breakdown', show: Boolean(story?.breakdown) },
    { num: 5, label: 'Compare', show: Boolean(story?.comparison) },
    { num: 6, label: 'Standouts', show: Boolean(story?.standouts) },
    { num: 7, label: 'Explore', show: true }
  ].filter((item) => item.show);

  const jumpToSlide = (num) => {
    document.querySelector(`[data-slide-index="${num}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] pt-20 pb-28 px-6 transition-colors font-sans relative">

      {/* TOP SLIDE NAV — jump between narrated Acts; also doubles as a
          progress indicator via the highlighted current Act. */}
      {actNavItems.length > 1 && (
        <nav className="print:hidden fixed top-16 left-1/2 -translate-x-1/2 z-40 bg-[var(--panel)]/95 backdrop-blur-md border border-[var(--line)] rounded-full shadow-md px-1.5 py-1.5 flex items-center gap-1">
          {actNavItems.map((item) => (
            <button
              key={item.num}
              onClick={() => jumpToSlide(item.num)}
              title={item.label}
              className={`px-2.5 h-7 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                activeSlide === item.num
                  ? 'bg-[#b5470b] text-white'
                  : 'text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)]'
              }`}
            >
              {item.num}
            </button>
          ))}
        </nav>
      )}

      {/* FLOATING MINIMALIST SLIDESHOW COUNTER */}
      <div className="print:hidden fixed bottom-6 left-6 z-40 bg-[var(--ink)] text-[var(--bg)] px-4 py-2 rounded-full font-mono text-xs shadow-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#b5470b] animate-pulse" />
        <span>SLIDE {String(activeSlide).padStart(2, '0')} / 07</span>
      </div>

      {/* STICKY CONSTELLATION FILTER INDICATOR */}
      {constellationFilter && (
        <div className="print:hidden sticky top-20 z-30 flex justify-center w-full mb-4 pointer-events-none">
          <div className="bg-[#b5470b] text-white px-4 py-1.5 rounded-full font-mono text-xs flex items-center gap-3 shadow-md pointer-events-auto">
            <span>Filtered: <strong>{constellationFilter}</strong></span>
            <button onClick={() => setConstellationFilter(null)} className="hover:text-white/70 transition-colors">✕</button>
          </div>
        </div>
      )}

      <div className="max-w-[1280px] mx-auto">
        
        {/* TOP BAR: Dataset Header */}
        <DatasetHeader
          onBackToHome={onBackToHome}
          filteredRows={filteredRows}
        />

        {/* SCROLL-DRIVEN SLIDESHOW CONTAINER (ACTS 1 TO 5) */}
        {story && (
          <div className="space-y-36 mb-36">
            
            {/* SLIDE 1 / ACT 1: AT A GLANCE */}
            {story.overview && (
              <section
                data-slide-index="1"
                className={`dashboard-slide h-[100dvh] overflow-y-auto snap-start flex flex-col justify-start pt-32 border-t border-[var(--ink)]/10 transition-all duration-300 ease-out transform ${
                  visibleSlides.has(1) ? 'opacity-100 translate-y-0 scale-100' : 'opacity-20 translate-y-12 scale-[0.98]'
                }`}
              >
                <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[#b5470b] mb-4">
                  01 · AT A GLANCE
                </div>

                {/* Ultra-Clean Editorial Pull-Quote */}
                <h2
                  className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-[var(--ink)] leading-tight mb-12 max-w-5xl"
                  dangerouslySetInnerHTML={{ __html: story.overview.narrative }}
                />

                {/* KPI Summary Cards (always uses full dataset) */}
                {config?.kpiConfigs && (
                  <KPICards
                    kpiConfigs={config.kpiConfigs}
                    rows={activeDataset.rows}
                    meta={config.meta}
                  />
                )}
              </section>
            )}

            {/* SLIDE 2 / ACT 2: THE MAP (PARTICLE SWARM VIEW) */}
            {config?.meta && activeDataset?.rows && (
              <ParticleSwarm rows={activeDataset.rows} meta={config.meta} actIndex={2} />
            )}

            {/* SLIDE 3 / ACT 3: THE BIG TREND */}
            {story.trend && (
              <section
                data-slide-index="3"
                className={`dashboard-slide h-[100dvh] overflow-y-auto snap-start flex flex-col justify-start pt-32 border-t border-[var(--ink)]/10 transition-all duration-300 ease-out transform ${
                  visibleSlides.has(3) ? 'opacity-100 translate-y-0 scale-100' : 'opacity-20 translate-y-12 scale-[0.98]'
                }`}
              >
                <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[#b5470b] mb-4">
                  03 · THE BIG TREND
                </div>

                {/* Editorial Pull-Quote Narrative */}
                <h2
                  className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-[var(--ink)] leading-tight mb-12 max-w-5xl"
                  dangerouslySetInnerHTML={{ __html: story.trend.narrative }}
                />

                {/* Full Width Line/Area Chart */}
                <ActTrendChart data={constellationRows} trendInfo={story.trend} />
              </section>
            )}

            {/* SLIDE 4 / ACT 4: THE BREAKDOWN */}
            {story.breakdown && (
              <section
                data-slide-index="4"
                className={`dashboard-slide h-[100dvh] overflow-y-auto snap-start flex flex-col justify-start pt-32 border-t border-[var(--ink)]/10 transition-all duration-300 ease-out transform ${
                  visibleSlides.has(4) ? 'opacity-100 translate-y-0 scale-100' : 'opacity-20 translate-y-12 scale-[0.98]'
                }`}
              >
                <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[#b5470b] mb-4">
                  04 · THE BREAKDOWN
                </div>

                {/* Editorial Pull-Quote Narrative */}
                <h2
                  className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-[var(--ink)] leading-tight mb-12 max-w-5xl"
                  dangerouslySetInnerHTML={{ __html: story.breakdown.narrative }}
                />

                {/* Horizontal Growing Bar Chart */}
                <ActBreakdownChart breakdownInfo={story.breakdown} />
              </section>
            )}

            {/* SLIDE 5 / ACT 5: THE COMPARISON */}
            {story.comparison && (
              <section
                data-slide-index="5"
                className={`dashboard-slide h-[100dvh] overflow-y-auto snap-start flex flex-col justify-start pt-32 border-t border-[var(--ink)]/10 transition-all duration-300 ease-out transform ${
                  visibleSlides.has(5) ? 'opacity-100 translate-y-0 scale-100' : 'opacity-20 translate-y-12 scale-[0.98]'
                }`}
              >
                <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[#b5470b] mb-4">
                  05 · THE COMPARISON
                </div>

                {/* Editorial Pull-Quote Narrative */}
                <h2
                  className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-[var(--ink)] leading-tight mb-12 max-w-5xl"
                  dangerouslySetInnerHTML={{ __html: story.comparison.narrative }}
                />

                {/* Dual-Line / Overlaid Comparison Chart */}
                <ActComparisonChart data={constellationRows} comparisonInfo={story.comparison} />
              </section>
            )}

            {/* SLIDE 6 / ACT 6: WHAT STANDS OUT */}
            {story.standouts && (
              <section
                data-slide-index="6"
                className={`dashboard-slide h-[100dvh] overflow-y-auto snap-start flex flex-col justify-start pt-32 border-t border-[var(--ink)]/10 transition-all duration-300 ease-out transform ${
                  visibleSlides.has(6) ? 'opacity-100 translate-y-0 scale-100' : 'opacity-20 translate-y-12 scale-[0.98]'
                }`}
              >
                <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[#b5470b] mb-4">
                  06 · WHAT STANDS OUT
                </div>

                {/* Editorial Pull-Quote Narrative */}
                <h2
                  className="font-serif font-normal text-3xl sm:text-4xl md:text-5xl text-[var(--ink)] leading-tight mb-12 max-w-5xl"
                  dangerouslySetInnerHTML={{ __html: story.standouts.narrative }}
                />

                {/* Top 5 vs Bottom 5 Mini Tables */}
                <ActStandoutsTables standoutsInfo={story.standouts} />
              </section>
            )}

          </div>
        )}

            {/* SLIDE 7 / ACT 7: EXPLORE IT YOURSELF (Full Interactive Studio) */}
        <section
          id="act-7-explore"
          data-slide-index="7"
          className={`print:hidden dashboard-slide snap-start pt-16 border-t-2 border-[var(--ink)]/15 transition-all duration-300 ease-out transform ${
            visibleSlides.has(7) ? 'opacity-100 translate-y-0' : 'opacity-20 translate-y-12'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="font-mono text-xs font-semibold uppercase tracking-widest text-[#b5470b] mb-2">
                07 · EXPLORE IT YOURSELF
              </div>
              <h2 className="font-serif font-normal text-4xl sm:text-5xl md:text-6xl text-[var(--ink)] tracking-tight">
                Now dig in
              </h2>
              <p className="font-mono text-xs text-[var(--muted)] uppercase tracking-wider mt-2">
                Apply filters to slice the data. Export what you find.
              </p>
            </div>

            <a
              href="#act-7-explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#161513] text-white text-xs font-mono font-semibold hover:bg-[#b5470b] transition-colors shadow-sm"
            >
              <span>Interactive Studio</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* STICKY FILTER BAR FOR ACT 7 */}
          {config?.meta && (
            <FilterBar
              meta={config.meta}
              rows={constellationRows}
              filters={filters}
              onFilterChange={setFilters}
              onClearFilters={clearAllFilters}
              displayColumns={displayColumns}
            />
          )}

          {/* MAIN DASHBOARD LAYOUT WITH SIDEBAR FOR ACT 7 */}
          <div className="flex flex-col lg:flex-row gap-8 items-start relative mt-8">
            
            {/* COLLAPSIBLE SIDEBAR: Column Selector & Controls */}
            {/* Ordered after the charts/table on mobile (order-2) so users see
                data before a tall filter-attribute list; restored to its usual
                left position at lg+ (order-1). */}
            <aside
              className={`order-2 lg:order-1 transition-all duration-300 ease-in-out shrink-0 w-full ${
                isSidebarOpen ? 'lg:w-64' : 'lg:w-12'
              }`}
            >
              <div className="bg-white border border-[var(--ink)]/10 rounded-[20px] p-5 shadow-sm sticky top-24 transition-colors">
                
                {/* Sidebar Header & Toggle Button */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[var(--ink)]/8">
                  {isSidebarOpen ? (
                    <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider font-semibold text-[var(--ink)]">
                      <Sliders className="w-4 h-4 text-[#b5470b]" />
                      <span>Attribute Filters</span>
                    </div>
                  ) : (
                    <div className="mx-auto">
                      <Sliders className="w-4 h-4 text-[#b5470b]" />
                    </div>
                  )}

                  {/* The collapse only changes anything at lg+ (below that the
                      sidebar is always full-width), so hide the toggle rather
                      than show a control that visibly does nothing on mobile/tablet. */}
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                    className="hidden lg:block p-1 rounded-[6px] hover:bg-[var(--bg)] text-[var(--muted)] cursor-pointer"
                  >
                    {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                </div>

                {/* Sidebar Content (when expanded) */}
                {isSidebarOpen && (
                  <div className="mt-4 space-y-5 text-xs font-sans">
                    
                    {/* Attribute Visibility Selector Checklist */}
                    <div>
                      <div className="flex items-center justify-between mb-2 text-[11px] font-mono uppercase text-[var(--muted)]">
                        <span>Toggle Attributes ({visibleColumns.length}/{allColumns.length})</span>
                        <div className="flex items-center gap-3">
                          {Object.keys(typeOverrides).length > 0 && (
                            <button
                              onClick={resetTypeOverrides}
                              title="Revert all manual type reassignments back to auto-detected"
                              className="text-[var(--muted-2)] hover:underline cursor-pointer font-semibold normal-case"
                            >
                              Reset types
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setVisibleColumns(
                                visibleColumns.length === allColumns.length ? [allColumns[0]] : [...allColumns]
                              )
                            }
                            className="text-[#b5470b] hover:underline cursor-pointer font-semibold"
                          >
                            {visibleColumns.length === allColumns.length ? 'Deselect' : 'All'}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-[var(--muted-2)] normal-case mb-2 -mt-1">
                        Click the type icon to reassign a column if auto-detection got it wrong.
                      </p>

                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {allColumns.map((col) => {
                          const isVisible = visibleColumns.includes(col);
                          const colType = config?.meta?.types?.[col] || 'text';
                          const isOverridden = typeOverrides[col] !== undefined;

                          let TypeIcon = Type;
                          let typeColor = 'text-gray-400';

                          if (colType === 'numeric') {
                            TypeIcon = Hash;
                            typeColor = 'text-blue-500';
                          } else if (colType === 'categorical') {
                            TypeIcon = Tag;
                            typeColor = 'text-amber-600';
                          } else if (colType === 'date') {
                            TypeIcon = Calendar;
                            typeColor = 'text-emerald-600';
                          }

                          return (
                            <div
                              key={col}
                              onClick={() => toggleColumnVisibility(col)}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-[8px] border transition-colors cursor-pointer ${
                                isVisible
                                  ? 'bg-[var(--bg)] border-[var(--ink)]/10 text-[var(--ink)]'
                                  : 'opacity-40 border-transparent text-[var(--muted-2)]'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {isVisible ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-[#b5470b] shrink-0" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-[var(--muted-2)] shrink-0" />
                                )}
                                <span className="truncate font-mono text-[11px] font-medium">{formatColName(col)}</span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cycleColumnType(col, colType);
                                }}
                                title={`${isOverridden ? 'Manually set to' : 'Detected as'} "${colType}" — click to reassign`}
                                className={`ml-1 shrink-0 p-0.5 rounded hover:bg-white cursor-pointer ${isOverridden ? 'ring-1 ring-[#b5470b]/50' : ''}`}
                              >
                                <TypeIcon className={`w-3 h-3 ${typeColor}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Summary Metric Stats Box */}
                    <div className="p-3.5 bg-[var(--bg)] border border-[var(--ink)]/10 rounded-[12px] space-y-2">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-[#b5470b]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Data Engine Status</span>
                      </div>

                      <div className="space-y-1 font-mono text-[11px] text-[var(--muted)]">
                        <div className="flex justify-between">
                          <span>Categoricals:</span>
                          <span className="font-bold text-[var(--ink)]">
                            {config?.meta?.categoricalCols?.length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Metrics:</span>
                          <span className="font-bold text-[var(--ink)]">
                            {config?.meta?.numericCols?.length || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Time Axis:</span>
                          <span className="font-bold text-[var(--ink)]">
                            {config?.meta?.dateCol ? formatColName(config.meta.dateCol) : 'None'}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-[var(--ink)]/8">
                          <span>Filtered Rows:</span>
                          <span className="font-bold text-[#b5470b]">
                            {filteredRows.length.toLocaleString()} / {constellationRows.length.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </aside>

            {/* MAIN GRID CONTENT FOR ACT 6 */}
            <main className="order-1 lg:order-2 flex-1 w-full min-w-0">
              
              {/* RECHARTS PANELS */}
              {config && (
                <ChartBuilder
                  chart1Config={config.chart1}
                  chart2Config={config.chart2}
                  chart3Config={config.chart3}
                  rows={filteredRows}
                  meta={config.meta}
                  displayColumns={displayColumns}
                />
              )}

              {/* SEARCHABLE DATA TABLE */}
              <DataTableExplorer
                rows={filteredRows}
                columns={displayColumns}
                meta={config?.meta}
              />

              {/* STATISTICAL SUMMARY MATRIX */}
              <AnalyticsSummary />

            </main>
          </div>

        </section>

      </div>
    </div>
  );
}
