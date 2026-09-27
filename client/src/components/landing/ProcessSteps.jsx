import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function ProcessSteps() {
  const sectionRef = useRef(null);
  const pinRef = useRef(null);
  const stichRef = useRef(null);
  const xpRef = useRef(null);
  const plate0Ref = useRef(null);
  const plate1Ref = useRef(null);
  const plate2Ref = useRef(null);
  const plate3Ref = useRef(null);
  const co0Ref = useRef(null);
  const co1Ref = useRef(null);
  const co2Ref = useRef(null);
  const co3Ref = useRef(null);
  const pulseRef = useRef(null);
  const gridRef = useRef(null);
  const ruleRef = useRef(null);
  const ifNodeRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const plates = [plate0Ref.current, plate1Ref.current, plate2Ref.current, plate3Ref.current];
      const cos = [co0Ref.current, co1Ref.current, co2Ref.current, co3Ref.current];

      if (!plates[0] || !cos[0]) return;

      const COMPACT = [-12, -4, 4, 12];
      const OPEN = [-140, -46, 46, 140];

      // Initial state matching justus-john.com
      gsap.set(plates, { xPercent: -50, yPercent: -50, rotationX: 56, y: (i) => COMPACT[i] });
      gsap.set(cos, { yPercent: -50, y: (i) => OPEN[i] });
      gsap.set(pulseRef.current, { xPercent: -50, yPercent: -50, opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinRef.current,
          start: 'top top',
          end: '+=220%',
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // 1. Title Stichwort enters & fades
      tl.fromTo(stichRef.current, 
        { opacity: 0, y: 44, scale: 1.05 },
        { opacity: 1, y: 0, scale: 1, duration: 0.85, ease: 'power3.out' }, 0
      );
      tl.to(stichRef.current, 
        { opacity: 0, y: -34, scale: 0.96, filter: 'blur(6px)', duration: 0.55, ease: 'power2.in' }, 1.2
      );

      // 2. Compact stack appears
      const T0 = 1.8;
      tl.fromTo(xpRef.current, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, T0);

      // 3. Explosion: 3D plates expand vertically & callouts stagger in
      tl.addLabel('open', T0 + 0.6);
      plates.forEach((p, i) => {
        tl.to(p, { y: OPEN[i], duration: 0.9, ease: 'power2.inOut' }, 'open+=' + (i * 0.06));
      });
      tl.fromTo(cos, { opacity: 0, x: 14 },
        { opacity: 0.95, x: 0, duration: 0.4, stagger: 0.08 }, 'open+=0.4'
      );

      // 4. Terracotta pulse dot falls down layer by layer
      tl.addLabel('pulse', T0 + 2.0);
      tl.fromTo(pulseRef.current, { y: OPEN[0], opacity: 0 }, { opacity: 1, duration: 0.15 }, 'pulse');
      tl.to(pulseRef.current, { y: OPEN[1], duration: 0.35, ease: 'power1.inOut' }, 'pulse+=0.2');
      tl.to(ruleRef.current, { color: '#b5470b', duration: 0.2 }, 'pulse+=0.45');
      tl.to(pulseRef.current, { y: OPEN[2], duration: 0.35, ease: 'power1.inOut' }, 'pulse+=0.7');
      
      // Data grid cell lights up terracotta
      if (gridRef.current && gridRef.current.children[13]) {
        tl.to(gridRef.current.children[13], { backgroundColor: 'rgba(181, 71, 11, 0.6)', duration: 0.25 }, 'pulse+=0.95');
      }
      tl.to(pulseRef.current, { y: OPEN[3], duration: 0.35, ease: 'power1.inOut' }, 'pulse+=1.2');
      if (ifNodeRef.current) {
        tl.to(ifNodeRef.current, { color: '#b5470b', duration: 0.2 }, 'pulse+=1.45');
      }
      tl.to(pulseRef.current, { x: 72, opacity: 0, duration: 0.3, ease: 'power1.in' }, 'pulse+=1.65');

    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const gridCells = Array.from({ length: 24 }).map((_, i) => [1, 4, 8, 11, 14, 19, 21].includes(i));

  return (
    <section ref={sectionRef} id="ablauf" className="akt relative border-b border-[#161513]/10">
      {/* Index Banner */}
      <div className="akt__index">
        <span className="akt__no">05</span>
        <span className="akt__label">PROCESS WORKFLOW</span>
      </div>

      <div ref={pinRef} className="akt__pin flex flex-col justify-center">
        <div className="stage flex flex-col items-center justify-center">
          
          {/* Section Heading Stichwort */}
          <div ref={stichRef} className="text-center max-w-2xl px-6 pointer-events-none z-10">
            <h2 className="font-serif text-4xl sm:text-6xl text-[#161513] font-normal leading-tight">
              One pipeline. Infinite data stories.
            </h2>
            <p className="font-mono text-xs sm:text-sm text-[#9b958c] tracking-widest uppercase mt-3">
              Explore how raw dataset rows transform into live narrative dashboards
            </p>
          </div>

          {/* 3D Exploded Layer Stack Container */}
          <div ref={xpRef} className="xp relative my-auto">
            <div className="xp__stack">
              
              {/* Plate 1: Studio View (UI) */}
              <div ref={plate0Ref} className="xp__plate xp__plate--ui">
                <div className="xp__ui">
                  <span className="xp__btn" />
                  <span className="xp__row" style={{ '--w': '100%' }} />
                  <span className="xp__row" style={{ '--w': '78%' }} />
                  <div className="xp__cal">
                    <i className="on" /><i /><i className="on2" />
                  </div>
                  <div className="xp__me">
                    <i /><span />
                  </div>
                </div>
              </div>

              {/* Plate 2: Logic Engine */}
              <div ref={plate1Ref} className="xp__plate xp__plate--logic">
                <div className="xp__lg">
                  <span ref={ruleRef}>when dataset upload <b>→ auto-detect types</b></span>
                  <span>when metric selected <b>→ generate chart</b></span>
                  <span>when search input <b>→ filter rows</b></span>
                </div>
              </div>

              {/* Plate 3: Data Grid */}
              <div ref={plate2Ref} className="xp__plate xp__plate--data">
                <div ref={gridRef} className="xp__grid">
                  {gridCells.map((isActive, i) => (
                    <i key={i} className={isActive ? 'on' : ''} />
                  ))}
                </div>
              </div>

              {/* Plate 4: Export Connectors */}
              <div ref={plate3Ref} className="xp__plate xp__plate--if">
                <div className="xp__ifs">
                  <span ref={ifNodeRef} className="xp__if"><i></i>CSV / JSON</span>
                  <span className="xp__if"><i></i>SQLite</span>
                  <span className="xp__if"><i></i>REST API</span>
                  <span className="xp__if"><i></i>Analytics</span>
                </div>
              </div>

              {/* Terracotta Glowing Pulse */}
              <span ref={pulseRef} className="xp__pulse" />
            </div>

            {/* Callout Labels on Right */}
            <span ref={co0Ref} className="xp__co">01 · STUDIO VIEW</span>
            <span ref={co1Ref} className="xp__co">02 · LOGIC ENGINE</span>
            <span ref={co2Ref} className="xp__co">03 · DATA PIPELINE</span>
            <span ref={co3Ref} className="xp__co">04 · EXPORT CONNECTORS</span>

          </div>

        </div>
      </div>
    </section>
  );
}
