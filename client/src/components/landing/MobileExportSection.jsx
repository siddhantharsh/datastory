import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WifiOff, Bell, Download, FileText, BarChart2 } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export function MobileExportSection() {
  const containerRef = useRef(null);
  const pinRef = useRef(null);
  const titleRef = useRef(null);
  const phoneRef = useRef(null);
  const notificationRef = useRef(null);
  const screenContentRef = useRef(null);
  const leftCalloutRef = useRef(null);
  const rightCalloutRef = useRef(null);
  const dot1Ref = useRef(null);
  const dot2Ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const pinEl = pinRef.current;
      const titleEl = titleRef.current;
      const phoneEl = phoneRef.current;
      const notifyEl = notificationRef.current;
      const contentEl = screenContentRef.current;
      const leftEl = leftCalloutRef.current;
      const rightEl = rightCalloutRef.current;

      if (!pinEl || !phoneEl) return;

      // Pinned scroll-jacking is disproportionately long on a short mobile
      // viewport and fights with the mobile browser's dynamic toolbar — skip
      // the pin below ~768px and scrub over a shorter, unpinned distance.
      const isMobile = window.innerWidth < 768;

      // Master Timeline for Scroll-Driven Mobile Showcase (matching Justus John Mobile Section)
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinEl,
          start: 'top top',
          end: isMobile ? '+=100%' : '+=400%',
          pin: !isMobile,
          scrub: 1,
          anticipatePin: 1
        }
      });

      // INITIAL STATE: Phone off-screen, Callouts & Notification hidden
      tl.set(titleEl, { opacity: 0, y: 30 });
      tl.set(phoneEl, { opacity: 0, y: 140, scale: 0.88 });
      tl.set(notifyEl, { opacity: 0, y: -30, scale: 0.9 });
      tl.set(leftEl, { opacity: 0, x: -40 });
      tl.set(rightEl, { opacity: 0, x: 40 });
      tl.set(contentEl, { y: 0 });
      tl.set(dot1Ref.current, { width: 20, backgroundColor: '#b5470b' });
      tl.set(dot2Ref.current, { width: 8, backgroundColor: 'rgba(22,21,19,0.2)' });

      // ACT 1 (Scroll 0-25%): Title & Phone Slide Up into Center Stage
      tl.to(titleEl, { opacity: 1, y: 0, duration: 1.0, ease: 'power2.out' }, 0);
      tl.to(phoneEl, { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out' }, 0.2);

      // ACT 2 (Scroll 25-50%): Push Notification Drops Down + Exterior Callouts Highlight
      tl.to(notifyEl, { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: 'back.out(1.5)' }, 1.2);
      tl.to(leftEl, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' }, 1.4);
      tl.to(rightEl, { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' }, 1.4);

      // ACT 3 (Scroll 50-80%): Phone Screen Content Automatically Scrolls / Slides Up
      tl.to(contentEl, { y: -160, duration: 1.5, ease: 'power2.inOut' }, 2.2);
      tl.to(dot1Ref.current, { width: 8, backgroundColor: 'rgba(22,21,19,0.2)', duration: 0.8 }, 2.5);
      tl.to(dot2Ref.current, { width: 20, backgroundColor: '#b5470b', duration: 0.8 }, 2.5);

      // ACT 4 (Scroll 80-100%): Unpin & Scale Stage Out
      tl.to([phoneEl, leftEl, rightEl], { opacity: 0.8, scale: 0.95, duration: 1.0, ease: 'power2.in' }, 3.8);

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="akt relative border-b border-[#161513]/10">
      {/* Section Index Header */}
      <div className="akt__index">
        <span className="akt__no">04</span>
        <span className="akt__label">ON-THE-GO EXPORT STUDIO</span>
      </div>

      <div ref={pinRef} className="akt__pin flex flex-col justify-center items-center py-12 overflow-hidden">
        <div className="w-full max-w-6xl mx-auto px-6 relative flex flex-col items-center">
          
          {/* Section Heading */}
          <div ref={titleRef} className="max-w-2xl text-center mb-8">
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#161513] tracking-tight mb-3">
              Export on the go.
            </h2>
            <p className="font-sans text-base sm:text-lg text-[#6f6a62] leading-relaxed">
              Generate mobile summaries, PDF reports, PNG chart cards, and clean CSV datasets straight from your device.
            </p>
          </div>

          {/* Mobile Phone Showcase Stage */}
          <div className="relative w-full max-w-4xl flex items-center justify-center my-2 py-2">
            
            {/* Left Exterior Leader Line Callout (Offline Sync) */}
            <div
              ref={leftCalloutRef}
              className="hidden md:flex items-center gap-3 absolute left-4 lg:left-12 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
            >
              <div className="text-right max-w-[160px]">
                <span className="font-mono text-xs font-semibold uppercase text-[#161513] block">
                  OFFLINE SYNC
                </span>
                <span className="font-mono text-[11px] text-[#9b958c]">
                  Fully accessible without active internet connection
                </span>
              </div>
              <div className="w-16 h-[1px] bg-[#161513]/25 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#161513]" />
              </div>
            </div>

            {/* Right Exterior Leader Line Callout (Push Export) */}
            <div
              ref={rightCalloutRef}
              className="hidden md:flex items-center gap-3 absolute right-4 lg:right-12 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
            >
              <div className="w-16 h-[1px] bg-[#b5470b]/35 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#b5470b]" />
              </div>
              <div className="text-left max-w-[160px]">
                <span className="font-mono text-xs font-semibold uppercase text-[#b5470b] block">
                  PUSH EXPORT
                </span>
                <span className="font-mono text-[11px] text-[#9b958c]">
                  Instant notification when exports complete
                </span>
              </div>
            </div>

            {/* iPhone Mockup Frame matching Justus John Phone Frame */}
            <div
              ref={phoneRef}
              className="w-[310px] sm:w-[350px] h-[620px] bg-[#161513] rounded-[48px] p-3.5 shadow-2xl relative border-4 border-[#2b2824] overflow-hidden"
              style={{
                boxShadow: '0 40px 110px -30px rgba(22, 21, 19, 0.45), 0 0 0 1px rgba(255,255,255,0.1)'
              }}
            >
              {/* Phone Outer Screen Container */}
              <div className="w-full h-full bg-[#faf9f7] rounded-[38px] overflow-hidden flex flex-col justify-between relative p-4 text-left font-sans">
                
                {/* Dynamic Island Notch */}
                <div className="w-full flex items-center justify-between px-3 pt-1 pb-2 text-xs font-mono font-medium text-[#161513] z-30">
                  <span>9:41</span>
                  <div className="w-24 h-5 bg-[#161513] rounded-full flex items-center justify-center gap-1.5 px-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] text-white font-mono">DataStory</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span>5G</span>
                    <div className="w-4 h-2 border border-[#161513] rounded-sm p-0.5">
                      <div className="w-full h-full bg-[#161513]" />
                    </div>
                  </div>
                </div>

                {/* Status Pill Header */}
                <div className="w-full flex items-center justify-between bg-white border border-[#161513]/10 rounded-full px-3 py-1.5 mb-2 shadow-sm z-20">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-[#44413c]">
                    <WifiOff className="w-3.5 h-3.5 text-[#b5470b]" />
                    <span>✈ offline export ready</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>

                {/* Push Notification Banner */}
                <div
                  ref={notificationRef}
                  className="w-full bg-white border border-[#b5470b]/30 rounded-2xl p-3 mb-2 shadow-md z-20"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5 text-[#b5470b] font-semibold font-mono">
                      <Bell className="w-3.5 h-3.5" />
                      <span>EXPORT READY #1</span>
                    </div>
                    <span className="text-[9px] font-mono text-[#9b958c]">Now</span>
                  </div>
                  <p className="font-sans text-xs text-[#161513] font-medium leading-snug">
                    Data Story summary for 'Facebook metrics.csv' generated cleanly.
                  </p>
                </div>

                {/* Scrollable Viewport Container inside Phone */}
                <div className="flex-1 overflow-hidden relative z-10">
                  <div ref={screenContentRef} className="space-y-3 pt-1">
                    
                    {/* Card 1: Executive KPI Report */}
                    <div className="bg-white border border-[#161513]/10 rounded-2xl p-3.5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-[#161513]/10 pb-2 mb-2.5">
                        <span className="font-serif font-semibold text-sm text-[#161513]">
                          Executive Summary
                        </span>
                        <span className="font-mono text-[9px] text-[#b5470b] font-semibold uppercase">
                          6-ACT STORY
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="p-2 bg-[#faf9f7] rounded-lg border border-[#161513]/5 text-center">
                          <span className="text-[9px] font-mono text-[#9b958c] uppercase block">
                            Total Records
                          </span>
                          <span className="font-serif font-bold text-base text-[#161513]">
                            12,847
                          </span>
                        </div>
                        <div className="p-2 bg-[#faf9f7] rounded-lg border border-[#161513]/5 text-center">
                          <span className="text-[9px] font-mono text-[#9b958c] uppercase block">
                            Peak Trajectory
                          </span>
                          <span className="font-serif font-bold text-base text-[#b5470b]">
                            +42.8%
                          </span>
                        </div>
                      </div>

                      <div className="p-2 bg-[#faf9f7] rounded-lg border border-[#161513]/5">
                        <span className="text-[9px] font-mono text-[#9b958c] uppercase block mb-1">
                          Monthly Metric Breakdown
                        </span>
                        <div className="h-16 flex items-end justify-between gap-1 pt-1">
                          {[40, 65, 80, 50, 95, 75].map((val, i) => (
                            <div key={i} className="flex-1 bg-[#b5470b] rounded-t-sm" style={{ height: `${val}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Export Data Format Selector */}
                    <div className="bg-white border border-[#161513]/10 rounded-2xl p-3.5 shadow-sm space-y-2">
                      <span className="font-mono text-[10px] text-[#9b958c] uppercase block">
                        Export Formats Ready
                      </span>
                      <div className="flex items-center justify-between p-2 bg-[#faf9f7] rounded-lg border border-[#161513]/5 font-mono text-xs text-[#161513]">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-[#b5470b]" />
                          <span>datastory_report.pdf</span>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-700">1.2 MB</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[#faf9f7] rounded-lg border border-[#161513]/5 font-mono text-xs text-[#161513]">
                        <div className="flex items-center gap-2">
                          <BarChart2 className="w-3.5 h-3.5 text-[#b5470b]" />
                          <span>charts_bundle.png</span>
                        </div>
                        <span className="text-[9px] font-bold text-emerald-700">4.8 MB</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bottom Indicator Dots inside Phone */}
                <div className="flex items-center justify-center gap-2 pt-3 pb-1 z-30">
                  <span ref={dot1Ref} className="h-2 rounded-full transition-all" />
                  <span ref={dot2Ref} className="h-2 rounded-full transition-all" />
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
