import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowRight, Zap, Sparkles } from 'lucide-react';

export function FuseString({ onOpenDashboard }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLit, setIsLit] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(null);

  const handlePointerDown = (e) => {
    startYRef.current = e.clientY;
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (startYRef.current === null) return;
    const dy = Math.max(0, e.clientY - startYRef.current);
    setDragY(Math.min(70, dy * 0.6));
  };

  const handlePointerUp = () => {
    if (startYRef.current === null) return;
    if (dragY > 30) {
      ignite();
    }
    startYRef.current = null;
    setIsDragging(false);
    setDragY(0);
  };

  const ignite = () => {
    if (isOpen) return;
    setIsLit(true);
    setTimeout(() => {
      setIsOpen(true);
      setIsLit(false);
    }, 520);
  };

  return (
    <>
      {/* Hanging Fuse Cord */}
      <div className={`fuse fixed top-0 right-12 sm:right-36 z-50 transition-opacity duration-500 ${isLit ? 'is-lit' : ''}`}>
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={() => { if (dragY <= 6) ignite(); }}
          className={`fuse__pull flex flex-col items-center cursor-grab touch-none ${
            isDragging ? 'is-drag transition-none' : 'transition-transform duration-500'
          }`}
          style={{ transform: `translateY(${dragY}px)` }}
        >
          <div className="fuse__cord relative w-[1px] h-28 bg-gradient-to-b from-transparent via-[#161513]/30 to-[#161513]/60">
            <div className={`fuse__spark absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#2563eb] shadow-[0_0_9px_2px_rgba(37,99,235,0.6)] ${
              isLit ? 'opacity-100 transition-all duration-500 -top-full' : 'opacity-0 bottom-0'
            }`} />
          </div>
          <div className="fuse__weight w-2.5 h-3.5 rounded-b-full bg-[#161513] hover:bg-[#2563eb] transition-colors" />
          <span className="fuse__label mt-2 font-mono text-[10px] font-semibold tracking-widest uppercase text-[#6f6a62]">
            PULL ME
          </span>
        </div>
      </div>

      {/* Full-screen Paper Glass Overlay matching justus-john step overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-[#faf9f7]/95 backdrop-blur-xl overflow-y-auto p-8 sm:p-16 flex items-center justify-center animate-fadeIn">
          <button
            onClick={() => setIsOpen(false)}
            className="fixed top-6 right-8 w-10 h-10 rounded-full border border-[#161513]/10 bg-white flex items-center justify-center text-[#161513] hover:bg-[#161513]/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="max-w-2xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#2563eb]/10 text-[#2563eb] font-mono text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>THE NEXT STEP</span>
            </div>

            <h2 className="font-serif font-normal text-4xl sm:text-6xl text-[#161513] leading-tight">
              Ready to ignite your data's story?
            </h2>

            <p className="text-base sm:text-lg text-[#44413c] leading-relaxed max-w-lg mx-auto">
              Observatory connects raw data points to meaningful insights. Import your CSV dataset now to run live queries, build custom visual charts, and export executive statistics.
            </p>

            <div className="pt-6">
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (onOpenDashboard) onOpenDashboard();
                }}
                className="font-serif text-2xl text-[#2563eb] hover:underline underline-offset-4 inline-flex items-center gap-2"
              >
                <span>Launch DataStory Studio</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
