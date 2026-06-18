"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CatLogo } from "@/components/layout/CatLogo";

/**
 * Anthropic-style brand morph (landing page only).
 *
 * A large "Transformation Hub" lockup sits at the top of the hero. As the user
 * scrolls the first stretch of the page, a fixed clone of it travels straight up
 * and shrinks until it lands exactly on the floating header's logo slot — then
 * crossfades to the *real* header logo so interactivity (the link, hover) is
 * handed back. Scrolling up reverses the whole thing.
 *
 * Mechanics (FLIP, scroll-scrubbed):
 *  - An in-flow, invisible "placeholder" reserves the big lockup's space in the
 *    hero and gives us the START rect (measured in document coords so a mid-page
 *    reload still lines up).
 *  - The header renders its normal logo lockup tagged [data-brand-dest], kept at
 *    opacity 0 on the landing page; its live rect is the END (it already tracks
 *    the header's own shrink-on-scroll, so we just aim at it each frame).
 *  - A portalled, position:fixed clone interpolates translate+scale by progress
 *    p = scrollY / (startTop − endTop). Because the vertical delta equals −scrollY,
 *    the clone visually scrolls with the page until it docks — exactly the feel
 *    of the wordmark "lifting" into the header.
 *  - Over the last slice of travel the clone fades out as [data-brand-dest] fades
 *    in, hiding any sub-pixel mismatch from the header's non-uniform shrink.
 *
 * Reduced motion: renders nothing; the header shows its logo normally (BrandBar
 * handles that side independently).
 */
export function HeroBrandMorph() {
  const [mounted, setMounted] = useState(false);
  const [reduce, setReduce] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduce(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useLayoutEffect(() => {
    if (reduce || !mounted) return;
    const clone = cloneRef.current;
    const placeholder = placeholderRef.current;
    if (!clone || !placeholder) return;

    const dest = document.querySelector<HTMLElement>("[data-brand-dest]");

    // START captured in document coords (stable across scroll position).
    let startDocTop = 0;
    let startDocLeft = 0;
    let startW = 1;
    const measureStart = () => {
      const r = placeholder.getBoundingClientRect();
      startDocTop = r.top + window.scrollY;
      startDocLeft = r.left + window.scrollX;
      startW = r.width || 1;
      clone.style.top = `${startDocTop}px`;
      clone.style.left = `${startDocLeft}px`;
    };

    let ticking = false;
    const apply = () => {
      ticking = false;
      const scrollY = window.scrollY;
      const destR = dest?.getBoundingClientRect();
      if (!destR || destR.width === 0) {
        // No header slot to dock to — fail safe: reveal the real header logo.
        if (dest) dest.style.opacity = "1";
        clone.style.opacity = "0";
        return;
      }
      const endTop = destR.top;
      const endLeft = destR.left;
      const endW = destR.width || 1;
      const travel = Math.max(1, startDocTop - endTop);
      const p = Math.min(1, Math.max(0, scrollY / travel));

      const tx = (endLeft - startDocLeft) * p;
      const ty = (endTop - startDocTop) * p;
      const scale = 1 + (endW / startW - 1) * p;
      clone.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;

      // Crossfade the last slice: clone out, real header logo in.
      const cross = Math.min(1, Math.max(0, (p - 0.86) / 0.14));
      clone.style.opacity = `${1 - cross}`;
      clone.style.pointerEvents = cross > 0.5 ? "none" : "auto";
      if (dest) {
        dest.style.opacity = `${cross}`;
        dest.style.pointerEvents = cross > 0.5 ? "auto" : "none";
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    };
    const onResize = () => {
      measureStart();
      apply();
    };

    measureStart();
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // Fonts/images can shift the start rect after first paint — re-measure once
    // they settle (the serif wordmark in particular changes width on font swap).
    const settle = setTimeout(onResize, 350);
    document.fonts?.ready.then(onResize).catch(() => {});
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      clearTimeout(settle);
      // Restore the header logo if this unmounts (navigating away).
      if (dest) {
        dest.style.opacity = "";
        dest.style.pointerEvents = "";
      }
    };
  }, [reduce, mounted]);

  if (reduce) return null;

  return (
    <>
      {/* In-flow placeholder: reserves the big lockup's space and provides the
          START rect. Invisible — the portalled clone is what the user sees. */}
      <div className="flex justify-center pt-2 pb-8 sm:pb-10 lg:pb-12">
        <div ref={placeholderRef} aria-hidden className="opacity-0 pointer-events-none">
          <BigBrand />
        </div>
      </div>

      {/* Portalled, viewport-fixed clone (escapes any transformed ancestor). */}
      {mounted &&
        createPortal(
          <Link
            ref={cloneRef}
            href="/"
            aria-label="Transformation Hub — home"
            className="fixed z-[60] origin-top-left will-change-transform no-underline"
            style={{ top: 0, left: 0, opacity: 0 }}
          >
            <BigBrand />
          </Link>,
          document.body
        )}
    </>
  );
}

/** The large brand lockup — same structure as the header lockup so a uniform
 *  scale-down lands cleanly on the header slot. */
function BigBrand() {
  return (
    <span className="flex items-center gap-3 sm:gap-4 text-ink select-none">
      <CatLogo size={64} className="shrink-0" />
      <span className="font-serif font-medium leading-[1.04] tracking-[-0.014em] whitespace-nowrap text-[34px] sm:text-[44px] lg:text-[52px]">
        Transformation <span className="text-teal italic font-normal">Hub</span>
      </span>
    </span>
  );
}
