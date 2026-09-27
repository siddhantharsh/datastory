import React from 'react';
import { useLenis } from '../../hooks/useLenis';
import { Github } from 'lucide-react';

export function SmoothScrollWrapper({ children }) {
  // Initialize Lenis + GSAP ScrollTrigger sync
  useLenis();

  return <div className="min-h-screen flex flex-col">{children}</div>;
}

export function Footer({ setCurrentPage }) {
  return (
    <footer className="mt-auto bg-[#faf9f7] border-t border-[#161513]/10 py-16 text-[#161513]">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="font-serif font-bold text-xl tracking-tight text-[#161513]">
            DataStory
          </span>
          <span className="text-xs font-mono text-[#9b958c]">·</span>
          <span className="text-xs font-mono text-[#6f6a62]">
            Built for Vision2Web Hackathon · 2026
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono text-[#6f6a62]">
          <button
            onClick={() => setCurrentPage('landing')}
            className="hover:text-[#161513] transition-colors"
          >
            Overview
          </button>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="hover:text-[#161513] transition-colors"
          >
            Studio
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[#161513] transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
