"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * YouTube "facade": shows the film's own thumbnail + a play button, and only
 * loads the (heavy) YouTube iframe on click. Keeps the hero fast; plays inline
 * with sound, the way a narrated film should be watched.
 */
export function HeroFilm({ videoId, title }: { videoId: string; title?: string }) {
  const [playing, setPlaying] = useState(false);
  const [thumb, setThumb] = useState(
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
  );

  return (
    <div className="relative aspect-video rounded-[14px] overflow-hidden border border-line bg-ink shadow-[0_1px_2px_rgba(26,38,37,0.05),0_30px_70px_-34px_rgba(26,38,37,0.45)]">
      {playing ? (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title ?? "Film"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 w-full h-full cursor-pointer"
          aria-label={`Play the film${title ? `: ${title}` : ""}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            onError={() => setThumb(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
          <span
            aria-hidden
            className="absolute inset-0 bg-ink/30 group-hover:bg-ink/20 transition-colors duration-200"
          />
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center justify-center w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full bg-paper/95 text-deep-teal shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] group-hover:scale-105 group-active:scale-95 transition-transform duration-200 ease-out"
          >
            <Play size={26} className="ml-0.5" fill="currentColor" strokeWidth={0} />
          </span>
          <span className="absolute bottom-3 right-4 font-mono text-[9.5px] uppercase tracking-[0.16em] text-paper/90">
            Watch the film
          </span>
        </button>
      )}
    </div>
  );
}
