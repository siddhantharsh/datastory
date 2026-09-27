import React, { useEffect, useRef } from 'react';
import mascotData from './mascotData.json';

export function Mascot({ onFrame, onComplete, centerY }) {
  const containerRef = useRef(null);
  const eyeLRef = useRef(null);
  const eyeRRef = useRef(null);
  const frameElsRef = useRef([]);

  useEffect(() => {
    let animId = null;
    let startTime = null;
    let mouseX = window.innerWidth * 0.6;
    let mouseY = window.innerHeight * 0.4;

    const handlePointer = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('pointermove', handlePointer, { passive: true });

    const container = containerRef.current;
    if (!container) return;

    if (centerY != null) {
      // Offset mascot vertically so head sprout leaf stays clear of title
      container.style.top = `${centerY + 24}px`;
    }

    const DUR = 6.2;
    const FPS = 10;
    const N = mascotData.frames.length;
    const heroWidth = window.innerWidth;
    const MW = 140;
    const startX = -MW - 24;
    const endX = heroWidth + MW * 0.45;

    let blinkT = -1;
    let nextBlink = 1.0;
    let lastIdx = -1;

    const step = (now) => {
      if (!startTime) startTime = now;
      const t = (now - startTime) / 1000;
      const prog = Math.min(1, t / DUR);
      const x = startX + (endX - startX) * prog;

      container.style.transform = `translate(${x.toFixed(1)}px, -50%)`;

      const idx = Math.floor(t * FPS) % N;
      if (idx !== lastIdx) {
        frameElsRef.current.forEach((el, i) => {
          if (el) el.style.display = i === idx ? 'block' : 'none';
        });
        lastIdx = idx;
      }

      // Eye pupil tracking
      if (container && eyeLRef.current && eyeRRef.current) {
        const eyeData = mascotData.frames[idx % N];
        const rect = container.getBoundingClientRect();
        
        [ [eyeLRef.current, eyeData.l], [eyeRRef.current, eyeData.r] ].forEach(([el, eData]) => {
          if (!el || !eData) return;
          const sx = rect.left + (eData.x / 640) * rect.width;
          const sy = rect.top + (eData.y / 700) * rect.height;
          const dx = mouseX - sx;
          const dy = mouseY - sy;
          const hx = Math.max(-1, Math.min(1, dx / 250));
          const vy = Math.max(-1, Math.min(1, dy / 250));
          const offX = hx < 0 ? 66 : 22;

          el.setAttribute('cx', (eData.x + hx * offX).toFixed(1));
          el.setAttribute('cy', (eData.y + vy * 24).toFixed(1));
          el.setAttribute('rx', eData.rx);

          let ry = eData.ry;
          if (blinkT >= 0) {
            const bp = blinkT / 0.14;
            const kk = bp < 0.5 ? (1 - bp / 0.5) : (bp - 0.5) / 0.5;
            ry = Math.max(1.5, eData.ry * Math.max(0.06, kk));
          }
          el.setAttribute('ry', ry.toFixed(1));
        });
      }

      if (blinkT >= 0) {
        blinkT += 1 / 60;
        if (blinkT > 0.14) blinkT = -1;
      } else if (t >= nextBlink) {
        blinkT = 0;
        nextBlink = t + 2.2;
      }

      // Mascot center X passed to callback for character reveal
      if (onFrame) onFrame(x + MW / 2);

      if (prog < 1) {
        animId = requestAnimationFrame(step);
      } else {
        container.style.display = 'none';
        if (onComplete) onComplete();
      }
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('pointermove', handlePointer);
    };
  }, [centerY, onFrame, onComplete]);

  return (
    <div
      ref={containerRef}
      className="mascot absolute left-0 top-1/2 w-[110px] sm:w-[140px] z-20 text-[#161513] pointer-events-none will-change-transform"
      style={{ transform: 'translate(-140px, -50%)' }}
    >
      <svg viewBox="0 0 640 700" fill="none" className="w-full h-auto overflow-visible">
        <defs>
          <filter id="masShadow" x="-60%" y="-200%" width="220%" height="500%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* Soft ground blur shadow under feet */}
        <ellipse
          cx="318"
          cy="715"
          rx="146"
          ry="8"
          fill="#141210"
          fillOpacity="0.18"
          filter="url(#masShadow)"
        />

        {/* Inner white body fill background shape */}
        <g transform={mascotData.transform}>
          <ellipse cx="3180" cy="3800" rx="1450" ry="1850" fill="#faf9f7" />
        </g>

        {/* 8 Vector outline frames with sprout leaf */}
        <g transform={mascotData.transform} fill="#161513">
          {mascotData.frames.map((frame, idx) => (
            <g
              key={idx}
              ref={(el) => (frameElsRef.current[idx] = el)}
              style={{ display: idx === 0 ? 'block' : 'none' }}
              dangerouslySetInnerHTML={{ __html: frame.path.replace('<path d="M39', '<path fill="#b5470b" d="M39') }}
            />
          ))}
        </g>

        {/* Tracking Pupil Eyes */}
        <g fill="#161513">
          <ellipse ref={eyeLRef} />
          <ellipse ref={eyeRRef} />
        </g>
      </svg>
    </div>
  );
}
