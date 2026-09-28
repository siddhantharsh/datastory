import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';
import { Lock, TrendingUp, BarChart2, Layers, Table, CheckCircle2 } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export function InteractiveDemo() {
  const pinRef = useRef(null);
  const chatRef = useRef(null);
  const promptTextRef = useRef(null);
  const bubbleBgRef = useRef(null);
  const editorRef = useRef(null);
  const browserWrapRef = useRef(null);
  const browserRef = useRef(null);
  const pathRef = useRef(null);
  const barChartRef = useRef(null);

  const [counts, setCounts] = useState({
    records: 0,
    revenue: 0,
    growth: 0,
    uptime: 0
  });

  const [statusText, setStatusText] = useState('ingesting...');

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Split prompt text into characters
      let chars = [];
      if (promptTextRef.current) {
        const split = new SplitType(promptTextRef.current, { types: 'words, chars', tagName: 'span' });
        chars = split.chars || [];
      }

      // SVG path length calculation for Line Chart
      const pathEl = pathRef.current;
      let pathLength = 600;
      if (pathEl && pathEl.getTotalLength) {
        pathLength = pathEl.getTotalLength();
        gsap.set(pathEl, {
          strokeDasharray: pathLength,
          strokeDashoffset: pathLength
        });
      }

      // Responsive browser wrap scaling matching justus-john sizeBrowserScale()
      const updateScale = () => {
        if (!browserWrapRef.current) return;
        const bs = Math.min(
          (0.94 * window.innerWidth) / 1020,
          (0.8 * window.innerHeight) / 660,
          0.84
        );
        browserWrapRef.current.style.setProperty('--bs', bs.toFixed(4));
      };
      updateScale();
      window.addEventListener('resize', updateScale);

      // Pinned scroll-jacking is disproportionately long on a short mobile
      // viewport and fights with the mobile browser's dynamic toolbar — skip
      // the pin below ~768px and scrub over a shorter, unpinned distance.
      // (The scaled-down browser mockup's legibility on small screens is a
      // separate, larger redesign left out of this pass.)
      const isMobile = window.innerWidth < 768;

      // Master Timeline matching justus-john.com buildAkt1 choreography
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: 'top top',
          end: isMobile ? '+=120%' : '+=550%',
          pin: !isMobile,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      // SECTION HEADER STICHWORT
      const S0 = 0.5;

      // BASELINE: Prompt chat message visible
      tl.set(chatRef.current, { opacity: 1, y: 0 }, 0);
      tl.set(chars, { opacity: 1 }, 0);
      tl.set(editorRef.current, { opacity: 0, y: 70, scale: 0.94, filter: 'blur(9px)' }, 0);
      tl.set(browserRef.current, { opacity: 0, y: 90, scale: 0.95, filter: 'blur(9px)' }, 0);

      // PHASE A: Customer prompt & header dissolve upwards
      tl.to(chatRef.current, {
        opacity: 0,
        y: -50,
        filter: 'blur(8px)',
        duration: 0.65,
        ease: 'power2.in'
      }, S0 + 0.4);

      // Letter Flight physics
      chars.forEach((c, i) => {
        const mx = (i % 2 === 0 ? 1 : -1) * (30 + (i * 8) % 120);
        const lift = 40 + (i * 12) % 80;
        const rot = ((i * 37) % 360) - 180;

        tl.to(c, {
          x: mx,
          y: -lift,
          rotation: rot,
          color: '#b5470b',
          duration: 0.85,
          ease: 'power1.in'
        }, S0 + i * 0.02);

        tl.to(c, {
          x: 0,
          y: 60 + (i % 5) * 20,
          scale: 0.4,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.in'
        }, S0 + i * 0.02 + 0.85);
      });

      // PHASE B: Code Editor slides up cleanly into focus & lines type out
      tl.to(editorRef.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.75,
        ease: 'power3.out'
      }, S0 + 0.85);

      const codeLines = editorRef.current.querySelectorAll('.ln');
      tl.fromTo(codeLines, {
        opacity: 0,
        xPercent: -4,
        filter: 'blur(4px)'
      }, {
        opacity: 1,
        xPercent: 0,
        filter: 'blur(0px)',
        duration: 0.4,
        stagger: 0.08,
        ease: 'power2.out'
      }, S0 + 1.0);

      // PHASE C: Compilation - Status switches to "live" with terracotta shadow pulse
      tl.add(() => setStatusText('live ✓'), S0 + 2.4);
      tl.fromTo(editorRef.current, {
        boxShadow: '0 30px 80px -36px rgba(22,21,19,.28), 0 0 0 0 rgba(181,71,11,0)'
      }, {
        boxShadow: '0 30px 80px -36px rgba(22,21,19,.28), 0 0 44px -8px rgba(181,71,11,.55)',
        duration: 0.3,
        yoyo: true,
        repeat: 1
      }, S0 + 2.4);

      // PHASE D: Code Editor zooms out, Browser Frame scales up
      tl.to(editorRef.current, {
        opacity: 0,
        y: -46,
        scale: 0.98,
        filter: 'blur(12px)',
        duration: 0.55,
        ease: 'power2.in'
      }, S0 + 2.8);

      tl.to(browserRef.current, {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.8,
        ease: 'power3.out'
      }, S0 + 3.1);

      // PHASE D.2: Blueprint Montage - Dashboard elements assemble
      const kpiItems = browserRef.current.querySelectorAll('.demo-kpi');
      tl.fromTo(kpiItems, {
        opacity: 0,
        y: 20,
        scale: 0.94
      }, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.12,
        ease: 'back.out(1.4)'
      }, S0 + 3.6);

      // Count-up numbers during scrub
      const countObj = { r: 0, rev: 0, g: 0, u: 0 };
      tl.to(countObj, {
        r: 12847,
        rev: 4.2,
        g: 23,
        u: 98.4,
        duration: 1.0,
        ease: 'none',
        onUpdate: () => {
          setCounts({
            records: Math.round(countObj.r),
            revenue: Number(countObj.rev.toFixed(1)),
            growth: Math.round(countObj.g),
            uptime: Number(countObj.u.toFixed(1))
          });
        }
      }, S0 + 3.8);

      // PHASE E: Bar Chart & Line Chart Drawing
      const bars = barChartRef.current.querySelectorAll('.demo-bar');
      tl.fromTo(bars, {
        scaleY: 0,
        transformOrigin: 'bottom center'
      }, {
        scaleY: 1,
        duration: 0.8,
        stagger: 0.08,
        ease: 'power2.out'
      }, S0 + 4.5);

      if (pathEl) {
        tl.to(pathEl, {
          strokeDashoffset: 0,
          duration: 1.0,
          ease: 'power1.inOut'
        }, S0 + 4.7);
      }

      // PHASE F: Data Table Rows Slide In Staggered
      const rows = browserRef.current.querySelectorAll('.demo-row');
      tl.fromTo(rows, {
        opacity: 0,
        x: -20
      }, {
        opacity: 1,
        x: 0,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power2.out'
      }, S0 + 5.2);

    }, pinRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="akt relative">
      {/* Section Index Header matching justus-john */}
      <div className="akt__index">
        <span className="akt__no">02</span>
        <span className="akt__label">INTERACTIVE DEMO STUDIO</span>
      </div>

      <div ref={pinRef} className="akt__pin">
        <div className="stage">
          
          {/* Layer 1: Customer Prompt Message Bubble */}
          <div ref={chatRef} className="chatmsg z-20">
            <div className="chatmsg__head">
              <div className="chatmsg__avatar">CSV</div>
              <span className="chatmsg__who">
                User Request <em>· CSV Upload</em>
              </span>
              <span className="chatmsg__time">11:42</span>
            </div>
            <div className="chatmsg__bubble">
              <div ref={bubbleBgRef} className="chatmsg__bubblebg" />
              <h2 ref={promptTextRef} className="request__text">
                "Upload dataset. Turn rows into visual analytics."
              </h2>
            </div>
          </div>

          {/* Layer 2: Code Editor Window */}
          <div ref={editorRef} className="editor z-10">
            <div className="editor__chrome">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="editor__tab">datastory_engine.js</span>
              <span className="editor__status font-mono text-xs">{statusText}</span>
            </div>
            <div className="editor__body">
              <pre className="code">
                <span className="ln" data-ln="1">
                  <span className="tok-kw">const</span> dataset = <span className="tok-kw">await</span> DataStory.<span className="tok-fn">ingest</span>(<span className="tok-str">'campus_attendance.csv'</span>);
                </span>
                <span className="ln" data-ln="2">
                  <span className="tok-kw">const</span> story = dataset.<span className="tok-fn">analyzeTypes</span>(&#123; autoDetect: <span className="tok-kw">true</span> &#125;);
                </span>
                <span className="ln" data-ln="3">
                  <span className="tok-comment">// Generieren: KPIs, Diagramme &amp; Filter-Studio</span>
                </span>
                <span className="ln" data-ln="4">
                  <span className="tok-kw">return</span> story.<span className="tok-fn">renderDashboard</span>();
                </span>
              </pre>
            </div>
          </div>

          {/* Layer 3: Pinned Browser Frame Mockup */}
          <div ref={browserWrapRef} className="browser-wrap z-30">
            <div className="browser-scale">
              <div ref={browserRef} className="browser">
                {/* Browser Chrome Bar */}
                <div className="browser__chrome">
                  <div className="flex items-center gap-2">
                    <span className="dot" style={{ background: '#ff5f56' }} />
                    <span className="dot" style={{ background: '#ffbd2e' }} />
                    <span className="dot" style={{ background: '#27c93f' }} />
                  </div>
                  <div className="browser__url">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>datastory.app/dashboard</span>
                  </div>
                </div>

                {/* Browser Viewport Canvas */}
                <div className="browser__viewport p-6 bg-[#faf9f7] h-full flex flex-col justify-between overflow-hidden">
                  
                  {/* Phase 2: 4 KPI Cards */}
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="demo-kpi p-4 bg-white border border-[#161513]/10 rounded-[12px] card-shadow">
                      <span className="text-[10px] font-mono uppercase text-[#9b958c] font-semibold block mb-1">
                        Total Records
                      </span>
                      <span className="font-serif font-bold text-2xl text-[#161513]">
                        {counts.records.toLocaleString()}
                      </span>
                      <span className="block text-[11px] text-emerald-600 font-medium mt-0.5">
                        ↑ 14.2% this week
                      </span>
                    </div>

                    <div className="demo-kpi p-4 bg-white border border-[#161513]/10 rounded-[12px] card-shadow">
                      <span className="text-[10px] font-mono uppercase text-[#9b958c] font-semibold block mb-1">
                        Total Revenue
                      </span>
                      <span className="font-serif font-bold text-2xl text-[#b5470b]">
                        ₹{counts.revenue}L
                      </span>
                      <span className="block text-[11px] text-emerald-600 font-medium mt-0.5">
                        ↑ ₹85K vs target
                      </span>
                    </div>

                    <div className="demo-kpi p-4 bg-white border border-[#161513]/10 rounded-[12px] card-shadow">
                      <span className="text-[10px] font-mono uppercase text-[#9b958c] font-semibold block mb-1">
                        Annual Growth
                      </span>
                      <span className="font-serif font-bold text-2xl text-[#161513]">
                        {counts.growth}%
                      </span>
                      <span className="block text-[11px] text-emerald-600 font-medium mt-0.5">
                        Top 5th percentile
                      </span>
                    </div>

                    <div className="demo-kpi p-4 bg-white border border-[#161513]/10 rounded-[12px] card-shadow">
                      <span className="text-[10px] font-mono uppercase text-[#9b958c] font-semibold block mb-1">
                        System Uptime
                      </span>
                      <span className="font-serif font-bold text-2xl text-[#161513]">
                        {counts.uptime}%
                      </span>
                      <span className="block text-[11px] text-[#6f6a62] font-medium mt-0.5">
                        Optimal performance
                      </span>
                    </div>
                  </div>

                  {/* Phase 3 & Phase 4: Charts */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Bar Chart */}
                    <div ref={barChartRef} className="p-4 bg-white border border-[#161513]/10 rounded-[12px] card-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-sans text-xs font-semibold text-[#161513] uppercase tracking-wider">
                          Monthly Attendance Distribution
                        </span>
                        <BarChart2 className="w-4 h-4 text-[#b5470b]" />
                      </div>
                      <div className="h-36 flex items-end justify-between gap-2 pt-2 px-1">
                        {[45, 68, 85, 52, 92, 74, 88, 96].map((val, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                            <div
                              className="demo-bar w-full bg-[#b5470b] rounded-t-[3px] relative"
                              style={{ height: `${val}%` }}
                            >
                              <div className="absolute -top-1 left-0 right-0 h-1 bg-[#e28a4f] rounded-t-[3px]" />
                            </div>
                            <span className="text-[9px] font-mono text-[#9b958c]">M{idx + 1}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Line Chart Path */}
                    <div className="p-4 bg-white border border-[#161513]/10 rounded-[12px] card-shadow flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-sans text-xs font-semibold text-[#161513] uppercase tracking-wider">
                          Ridership Trajectory
                        </span>
                        <TrendingUp className="w-4 h-4 text-[#b5470b]" />
                      </div>
                      <div className="h-36 w-full relative flex items-center justify-center">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 400 140">
                          <path
                            d="M 10 120 Q 80 100 120 50 T 240 40 T 380 15"
                            fill="none"
                            stroke="rgba(181,71,11,0.15)"
                            strokeWidth="5"
                          />
                          <path
                            ref={pathRef}
                            d="M 10 120 Q 80 100 120 50 T 240 40 T 380 15"
                            fill="none"
                            stroke="#b5470b"
                            strokeWidth="3"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Phase 5: Data Table Rows */}
                  <div className="p-3.5 bg-white border border-[#161513]/10 rounded-[12px] card-shadow">
                    <div className="flex items-center justify-between mb-2 text-[10px] font-mono uppercase text-[#9b958c]">
                      <span>Live Data Record Stream</span>
                      <span className="text-[#b5470b]">● VERIFIED</span>
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { id: 'REC-001', dept: 'Computer Science', val: '98.4%', status: 'Active' },
                        { id: 'REC-002', dept: 'Mechanical Eng.', val: '92.1%', status: 'Active' },
                        { id: 'REC-003', dept: 'Business Admin', val: '95.6%', status: 'Active' }
                      ].map((row, idx) => (
                        <div
                          key={idx}
                          className="demo-row flex items-center justify-between p-2 bg-[#faf9f7] rounded-[6px] border border-[#161513]/5 text-xs font-mono"
                        >
                          <span className="font-semibold text-[#b5470b]">{row.id}</span>
                          <span className="text-[#161513]">{row.dept}</span>
                          <span className="text-[#6f6a62]">{row.val}</span>
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-700 text-[9px] rounded-full font-sans font-semibold">
                            {row.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
