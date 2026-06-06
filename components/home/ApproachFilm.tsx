"use client";

import { useState } from "react";
import { Play } from "lucide-react";

const VIDEO_ID = "8XQ-Bv_mBAE";

/**
 * Lightweight YouTube facade for the "approach" band: a still + play button,
 * the iframe only mounts on click (no third-party weight on first paint).
 * hqdefault is used because maxresdefault is missing for this upload and
 * returns a grey 120x90 placeholder.
 */
export function ApproachFilm() {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="relative aspect-video rounded-[12px] overflow-hidden border border-line bg-deep-teal/5">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
          title="The Consortium for Agroecological Transformations"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full cursor-pointer"
          aria-label="Play the film about the Consortium's approach"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(22,19,13,0.10) 0%, rgba(22,19,13,0.42) 100%)",
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span
              className="inline-flex h-16 w-16 items-center justify-center rounded-full text-paper transition-transform duration-200 ease-out-expo group-hover:scale-110 group-active:scale-95"
              style={{
                background: "linear-gradient(155deg, #2E7573 0%, #334B4A 100%)",
                boxShadow:
                  "0 10px 28px -10px rgba(46,117,115,0.65), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <Play size={22} strokeWidth={2} className="ml-0.5" fill="currentColor" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
