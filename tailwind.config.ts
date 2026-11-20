import type { Config } from "tailwindcss";

/**
 * Colours are CSS custom properties (app/globals.css). Wrapping them in
 * color-mix with Tailwind's <alpha-value> placeholder makes opacity modifiers
 * (bg-teal/10, border-line/80) work; with a plain var() they compiled to
 * nothing and silently fell back to the default colour.
 */
const c = (v: string) => `color-mix(in srgb, var(${v}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  // Gate every `hover:` utility behind a real hover-capable pointer, so touch
  // taps don't get stuck in a hover state (lifts, scale, colour holds).
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        "deep-teal": c("--deep-teal"),
        teal: c("--teal"),
        "teal-soft": c("--teal-soft"),
        "teal-pale": c("--teal-pale"),
        "teal-wash": c("--teal-wash"),
        "navy-teal": c("--navy-teal"),
        "wordmark-navy": c("--wordmark-navy"),
        sage: c("--sage"),
        "sage-soft": c("--sage-soft"),
        "sage-wash": c("--sage-wash"),
        "periwinkle-deep": c("--periwinkle-deep"),
        periwinkle: c("--periwinkle"),
        "periwinkle-soft": c("--periwinkle-soft"),
        "periwinkle-pale": c("--periwinkle-pale"),
        "periwinkle-wash": c("--periwinkle-wash"),
        rose: c("--rose"),
        peach: c("--peach"),
        amber: c("--amber"),
        "amber-deep": c("--amber-deep"),
        cream: c("--cream"),
        paper: c("--paper"),
        ink: c("--ink"),
        "ink-soft": c("--ink-soft"),
        muted: c("--muted"),
        line: c("--line"),
        "line-soft": c("--line-soft"),
        rule: c("--rule"),
        "red-alert": c("--red-alert"),
        ochre: c("--ochre"),
        leaf: c("--leaf"),
        "periwinkle-text": c("--periwinkle-text"),
      },
      fontFamily: {
        // Legacy token: resolves to Inter (--font-fraunces is remapped in
        // app/layout.tsx). Only the header wordmark uses a serif.
        serif: ["var(--font-fraunces)", "system-ui", "sans-serif"],
        wordmark: ["var(--font-wordmark)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "hero-xl": ["clamp(44px, 5.6vw, 82px)", { lineHeight: "1.02", letterSpacing: "-0.025em" }],
        "hero-lg": ["46px", { lineHeight: "1.05", letterSpacing: "-0.022em" }],
        "title-lg": ["34px", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        "title-md": ["22px", { lineHeight: "1.18", letterSpacing: "-0.01em" }],
      },
      letterSpacing: {
        "mono-tight": "0.10em",
        "mono-mid": "0.14em",
        "mono-wide": "0.18em",
      },
      borderRadius: {
        tight: "var(--radius-tight)",
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
      },
      maxWidth: {
        page: "1200px",
        reading: "62ch",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
