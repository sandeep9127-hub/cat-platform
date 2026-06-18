"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Animated footer decoration (client island inside the server Footer):
 *  - the watercolor band wash drifts with a gentle scroll parallax
 *  - the goat signature rises + de-blurs once, when it enters view
 * Both are decorative and fully disabled under prefers-reduced-motion.
 * Absolutely positioned children anchor to the (relative, overflow-hidden)
 * <footer>.
 */
export function FooterDecor() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const bandRef = useRef<HTMLDivElement | null>(null);
  const goatRef = useRef<HTMLDivElement | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduced(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  // Goat: one-time rise + de-blur on view.
  useEffect(() => {
    const el = goatRef.current;
    if (!el) return;
    if (reduced) {
      el.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("in");
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  // Band: gentle scroll parallax (±12px). The band box overshoots its frame so
  // the drift never exposes an edge.
  useEffect(() => {
    if (reduced) return;
    const band = bandRef.current;
    const root = rootRef.current;
    if (!band || !root) return;
    let ticking = false;
    const apply = () => {
      ticking = false;
      const r = root.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      const shift = (p - 0.5) * 24;
      band.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none">
      {/* Watercolor band wash (parallax) */}
      <div className="absolute inset-0 opacity-[0.55]">
        <div ref={bandRef} className="absolute -top-5 -bottom-5 inset-x-0 will-change-transform">
          <Image
            src="/illustrations/meadow-band.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      </div>
      {/* Goat signature — bottom-right maker's mark */}
      <div
        ref={goatRef}
        className="goat-rise hidden md:block absolute z-10 bottom-3 right-[3%] lg:right-[5%] w-[150px] lg:w-[185px] select-none"
      >
        <Image
          src="/illustrations/goats.png"
          alt=""
          width={620}
          height={601}
          sizes="200px"
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}
