import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { UploadModal } from '../ui/UploadModal';
import { EditorAccessControl } from '../ui/EditorAccessControl';
import { Upload, ArrowRight, BarChart2 } from 'lucide-react';
import { useDataset } from '../../context/DatasetContext';

export function Navbar({ currentPage, setCurrentPage }) {
  const { datasets, activeDataset, selectDataset, isEditor } = useDataset();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      
      // Update top line progress
      if (maxScroll > 0) {
        setScrollProgress((currentY / maxScroll) * 100);
      }

      // Hide on scroll down, show on scroll up
      if (currentY > 80) {
        if (currentY > lastScrollY && currentY - lastScrollY > 10) {
          setIsVisible(false);
        } else if (currentY < lastScrollY && lastScrollY - currentY > 10) {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <>
      {/* Top scroll progress indicator bar matching justus-john */}
      <div className="scroll-progress">
        <span style={{ width: `${scrollProgress}%` }} />
      </div>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isVisible ? 'translate-y-0' : '-translate-y-full'
        } ${
          lastScrollY > 20
            ? 'bg-[#faf9f7]/85 backdrop-blur-md border-b border-[#161513]/10 py-3 shadow-xs'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          {/* Brand Wordmark in Display Serif */}
          <div
            onClick={() => setCurrentPage('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <span className="font-serif font-bold text-2xl tracking-tight text-[#161513] group-hover:text-[#b5470b] transition-colors">
              DataStory
            </span>
          </div>

          {/* Middle Breadcrumb section indicator */}
          <div className="hidden md:flex items-center text-xs font-mono text-[#6f6a62] uppercase tracking-wider">
            {currentPage === 'landing' ? (
              <span>// 01 · Data Storytelling Studio</span>
            ) : (
              <span>// 02 · Dashboard Studio</span>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {currentPage === 'landing' ? (
              <Button
                variant="primary"
                size="sm"
                icon={ArrowRight}
                onClick={() => setCurrentPage('dashboard')}
              >
                Try it →
              </Button>
            ) : (
              <>
                <EditorAccessControl />
                {isEditor && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Upload}
                    onClick={() => setIsUploadOpen(true)}
                  >
                    Import CSV
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  icon={BarChart2}
                  onClick={() => setCurrentPage('landing')}
                >
                  Overview
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => setCurrentPage('dashboard')}
      />
    </>
  );
}
