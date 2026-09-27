import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import SplitType from 'split-type';
import { Mascot } from './Mascot';
import { Button } from '../ui/Button';
import { ArrowRight, Database } from 'lucide-react';

export function Hero({ onExploreClick, onUploadClick }) {
  const heroRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const codeRef = useRef(null);
  const tokRef = useRef(null);
  const typedRef = useRef(null);
  const caretRef = useRef(null);
  const subRef = useRef(null);
  const cueRef = useRef(null);

  const [centerY, setCenterY] = useState(null);
  const [mascotDone, setMascotDone] = useState(false);

  const revealCharsRef = useRef([]);
  const charXRef = useRef([]);
  const charRightRelRef = useRef([]);
  const initialCaretXRef = useRef(0);
  const lastKRef = useRef(-1);

  useEffect(() => {
    const heroEl = heroRef.current;
    const codeEl = codeRef.current;
    const typedEl = typedRef.current;
    const tokEl = tokRef.current;

    if (!heroEl || !codeEl || !typedEl) return;

    // Smooth Entrance for Main Heading "Your data has a story to tell."
    gsap.fromTo(
      [line1Ref.current, line2Ref.current],
      { y: 44, opacity: 0, filter: 'blur(10px)', rotateX: 10, transformOrigin: 'bottom center' },
      { y: 0, opacity: 1, filter: 'blur(0px)', rotateX: 0, duration: 1.25, ease: 'power3.out', stagger: 0.18 }
    );

    // Split code line text into individual character spans
    const splitT = new SplitType(typedEl, { types: 'words, chars', tagName: 'span' });
    const chars = splitT.chars || [];

    revealCharsRef.current = chars;

    // Set initial hidden state for text characters
    gsap.set(chars, { opacity: 0 });
    gsap.set(subRef.current, { opacity: 0, y: 16 });
    gsap.set(cueRef.current, { opacity: 0 });

    // Measure element geometry for mascot trajectory & caret positioning
    const measure = () => {
      const hr = heroEl.getBoundingClientRect();
      const cr = codeEl.getBoundingClientRect();
      const tokR = tokEl ? tokEl.getBoundingClientRect() : null;

      setCenterY(cr.top - hr.top + cr.height / 2);

      const initX = tokR ? tokR.right - cr.left + 4 : 0;
      initialCaretXRef.current = initX;

      charXRef.current = chars.map((s) => {
        const r = s.getBoundingClientRect();
        return r.left - hr.left + r.width / 2;
      });

      charRightRelRef.current = chars.map((s) => {
        const r = s.getBoundingClientRect();
        return r.right - cr.left + 2;
      });

      // Position caret initially right after '//'
      if (caretRef.current) {
        if (lastKRef.current >= 0 && charRightRelRef.current[lastKRef.current] != null) {
          caretRef.current.style.transform = `translateX(${charRightRelRef.current[lastKRef.current]}px)`;
        } else {
          caretRef.current.style.transform = `translateX(${initX}px)`;
        }
      }
    };

    measure();
    window.addEventListener('resize', measure);

    return () => window.removeEventListener('resize', measure);
  }, []);

  // Mascot pass-through frame callback - reveals text and translates blinking caret
  const handleMascotFrame = useCallback((mascotX) => {
    const chars = revealCharsRef.current;
    const charX = charXRef.current;
    const charRightRel = charRightRelRef.current;

    if (!chars.length || !charX.length) return;

    let updatedK = lastKRef.current;
    for (let i = 0; i < chars.length; i++) {
      if (charX[i] <= mascotX && chars[i].style.opacity !== '1') {
        chars[i].style.opacity = '1';
        chars[i].style.transition = 'opacity .18s ease';
        if (i > updatedK) updatedK = i;
      }
    }
    lastKRef.current = updatedK;

    // Translate blinking caret dynamically to follow the mascot exactly
    if (caretRef.current && codeRef.current) {
      const cr = codeRef.current.getBoundingClientRect();
      let caretX = mascotX - cr.left;
      
      const minX = initialCaretXRef.current || 0;
      const maxX = charRightRel.length > 0 ? charRightRel[charRightRel.length - 1] : minX;
      
      caretX = Math.max(minX, Math.min(maxX, caretX));
      caretRef.current.style.transform = `translateX(${caretX}px)`;
    }
  }, []);

  // Mascot pass-through complete callback
  const handleMascotComplete = useCallback(() => {
    setMascotDone(true);

    // Safety reveal all chars
    revealCharsRef.current.forEach((s) => {
      if (s) s.style.opacity = '1';
    });

    // Ensure caret rests at end of text line
    if (caretRef.current && charRightRelRef.current.length > 0) {
      const lastPos = charRightRelRef.current[charRightRelRef.current.length - 1];
      caretRef.current.style.transform = `translateX(${lastPos}px)`;
    }

    // Fade in subtitle, CTA buttons, and scroll cue after mascot passes
    gsap.to([subRef.current, cueRef.current], {
      opacity: 1,
      y: 0,
      duration: 0.9,
      ease: 'power2.out',
      stagger: 0.15
    });
  }, []);

  return (
    <section
      ref={heroRef}
      className="hero relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden border-b border-[#161513]/10 pt-20 pb-16"
    >
      {/* Mascot Pass-Through walking across hero line */}
      {!mascotDone && (
        <Mascot
          centerY={centerY}
          onFrame={handleMascotFrame}
          onComplete={handleMascotComplete}
        />
      )}

      <div className="hero__inner max-w-4xl mx-auto flex flex-col items-center z-10 px-6">
        
        {/* Main Display Heading in Instrument Serif (No clipping, smooth split reveal) */}
        <div className="mb-6 overflow-visible">
          <h1 className="hero__plain font-serif font-normal text-6xl sm:text-7xl md:text-8xl lg:text-9xl leading-[1.06] tracking-tight text-[#161513]">
            <span ref={line1Ref} className="block opacity-0 will-change-transform pb-2">
              Your data has a
            </span>
            <span ref={line2Ref} className="block opacity-0 text-[#b5470b] italic mt-1 will-change-transform pb-2">
              story to tell.
            </span>
          </h1>
        </div>

        {/* Code Comment Line Revealed by Mascot */}
        <div
          ref={codeRef}
          className="hero__code font-mono text-sm sm:text-base text-[#746e63] italic flex items-center justify-center gap-1.5 mb-8 relative w-fit"
        >
          <span ref={tokRef} className="tok-comment">//</span>
          <span ref={typedRef} className="hero__typed">
            Upload any dataset. Watch it come alive.
          </span>
          <span
            ref={caretRef}
            className="caret bg-[#b5470b] absolute left-0 inline-block w-[3px] h-[1.1em] rounded-full animate-pulse transition-transform duration-75 ease-out"
          />
        </div>

        {/* Subtitle & Action CTAs (Fades in after Mascot passes) */}
        <div ref={subRef} className="hero__sub flex flex-col items-center gap-6 max-w-xl">
          <p className="text-base sm:text-lg text-[#44413c] leading-relaxed">
            DataStory transforms raw CSV spreadsheets into interactive charts, statistical matrices, and real-time visual insights with zero manual setup.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Button size="lg" icon={ArrowRight} onClick={onExploreClick}>
              Explore DataStory Studio
            </Button>
            <Button size="lg" variant="outline" icon={Database} onClick={onUploadClick}>
              Upload CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollcue Indicator at Bottom */}
      <div
        ref={cueRef}
        className="scrollcue cursor-pointer mt-16 flex flex-col items-center gap-3 z-10"
        onClick={onExploreClick}
      >
        <span className="scrollcue__glyph font-sans text-[11px] font-medium tracking-[0.18em] uppercase text-[#6f6a62]">
          SCROLL TO EXPLORE
        </span>
        <div className="scrollcue__line" />
      </div>
    </section>
  );
}

