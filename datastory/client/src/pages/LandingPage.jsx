import React, { useRef } from 'react';
import { Hero } from '../components/landing/Hero';
import { Features } from '../components/landing/Features';
import { InteractiveDemo } from '../components/landing/InteractiveDemo';
import { MobileExportSection } from '../components/landing/MobileExportSection';
import { ProcessSteps } from '../components/landing/ProcessSteps';
import { DatasetPickerCTA } from '../components/landing/DatasetPickerCTA';
import { FuseString } from '../components/landing/FuseString';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function LandingPage({ setCurrentPage }) {
  const pageRef = useRef(null);

  // GSAP ScrollTrigger reveals across landing page elements
  useScrollReveal(pageRef, '.gsap-reveal');

  return (
    <div ref={pageRef} className="w-full">
      {/* Hanging Fuse Cord at bottom near CTA */}
      <FuseString onOpenDashboard={() => setCurrentPage('dashboard')} />

      {/* SECTION 1: Hero */}
      <Hero
        onExploreClick={() => setCurrentPage('dashboard')}
        onUploadClick={() => setCurrentPage('dashboard')}
      />

      {/* SECTION 2: Capabilities ("What DataStory does") */}
      <Features />

      {/* SECTION 3: Interactive Demo (Pinned Centerpiece) */}
      <InteractiveDemo />

      {/* SECTION 4: Process Steps Workflow */}
      <ProcessSteps />

      {/* SECTION 6: On-The-Go Mobile Export Studio (Last showcase section before CTA) */}
      <MobileExportSection />

      {/* SECTION 7: CTA / Dataset Picker ("Start with a story") */}
      <DatasetPickerCTA onSelectDataset={() => setCurrentPage('dashboard')} />
    </div>
  );
}

