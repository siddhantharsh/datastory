import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useLenis() {
  useEffect(() => {
    // Lenis Smooth Scroll setup. duration was 1.2s with an expo-out easing —
    // heavy enough that the viewport kept drifting for close to a second
    // after wheel/trackpad input stopped, which read as "not real scrolling."
    // A shorter duration + standard cubic-out tracks much closer to native.
    const lenis = new Lenis({
      duration: 0.8,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      smoothTouch: false
    });

    // Synchronize Lenis scroll with GSAP ScrollTrigger ticker
    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
    };
  }, []);
}
