import type { Config } from "tailwindcss";

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
        "deep-teal": "var(--deep-teal)",
        teal: "var(--teal)",
        "teal-soft": "var(--teal-soft)",
        "teal-pale": "var(--teal-pale)",
        "teal-wash": "var(--teal-wash)",
        "navy-teal": "var(--navy-teal)",
        "wordmark-navy": "var(--wordmark-navy)",
        sage: "var(--sage)",
        "sage-soft": "var(--sage-soft)",
        "sage-wash": "var(--sage-wash)",
        "periwinkle-deep": "var(--periwinkle-deep)",
        periwinkle: "var(--periwinkle)",
        "periwinkle-soft": "var(--periwinkle-soft)",
        "periwinkle-pale": "var(--periwinkle-pale)",
        "periwinkle-wash": "var(--periwinkle-wash)",
        rose: "var(--rose)",
        peach: "var(--peach)",
        amber: "var(--amber)",
        "amber-deep": "var(--amber-deep)",
        cream: "var(--cream)",
        paper: "var(--paper)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        muted: "var(--muted)",
        line: "var(--line)",
        "line-soft": "var(--line-soft)",
        rule: "var(--rule)",
        "red-alert": "var(--red-alert)",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
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
      maxWidth: {
        page: "1280px",
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
