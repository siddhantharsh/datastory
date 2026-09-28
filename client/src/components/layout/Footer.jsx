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
    <footer className="mt-auto bg-[var(--bg)] border-t border-[var(--ink)]/10 py-16 text-[var(--ink)]">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <span className="font-serif font-bold text-xl tracking-tight text-[var(--ink)]">
            DataStory
          </span>
          <span className="text-xs font-mono text-[var(--muted-2)]">·</span>
          <span className="text-xs font-mono text-[var(--muted)]">
            Built for Vision2Web Hackathon · 2026
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs font-mono text-[var(--muted)]">
          <button
            onClick={() => setCurrentPage('landing')}
            className="hover:text-[var(--ink)] transition-colors"
          >
            Overview
          </button>
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="hover:text-[var(--ink)] transition-colors"
          >
            Studio
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-[var(--ink)] transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
