import { ImageResponse } from "next/og";

export const alt = "Transformation Hub, by the Consortium for Agroecological Transformations. A dashboard for sustainable food systems.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FBF8F2",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* top brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <svg width="48" height="48" viewBox="0 0 64 64">
            <g fill="none" strokeWidth="2.6" strokeLinecap="round">
              <path d="M9 30 A 23 23 0 0 1 55 30" stroke="#334B4A" />
              <path d="M16 30 A 16 16 0 0 1 48 30" stroke="#2E7573" />
              <path d="M24 30 A 8 8 0 0 1 40 30" stroke="#929CC5" />
            </g>
            <g fill="none" stroke="#929CC5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M32 33 C 22 38, 20 50, 28 58 C 32 53, 34 46, 32 33 Z" />
              <path d="M32 33 C 42 38, 44 50, 36 58 C 32 53, 30 46, 32 33 Z" />
            </g>
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#1A2625", fontSize: 26, lineHeight: 1, letterSpacing: "-0.01em" }}>
              Transformation <span style={{ color: "#2E7573", fontStyle: "italic" }}>Hub</span>
            </span>
            <span
              style={{
                color: "#6B7B7A",
                fontSize: 12,
                marginTop: 6,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontFamily: "monospace",
              }}
            >
              Consortium for Agroecological Transformations
            </span>
          </div>
        </div>

        {/* spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* hero text */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1040 }}>
          <span
            style={{
              color: "#2E7573",
              fontSize: 18,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontFamily: "monospace",
              marginBottom: 24,
            }}
          >
            Vol. 01 · Edition 2026
          </span>
          <h1
            style={{
              color: "#1A2625",
              fontSize: 92,
              lineHeight: 1.02,
              letterSpacing: "-0.025em",
              margin: 0,
              fontWeight: 400,
            }}
          >
            A dashboard for{" "}
            <span style={{ color: "#2E7573", fontStyle: "italic" }}>sustainable</span>
            <br />
            food systems.
          </h1>
        </div>

        {/* bottom rule */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #DDE0DA",
            paddingTop: 24,
            marginTop: 48,
            color: "#6B7B7A",
            fontSize: 14,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontFamily: "monospace",
          }}
        >
          <span>
            <span style={{ color: "#D9A655", marginRight: 12 }}>─</span>
            Curated, not crowdsourced
          </span>
          <span>cat-platform.org</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
