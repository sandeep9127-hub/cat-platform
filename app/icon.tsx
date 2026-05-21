import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FBF8F2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Official CAT mark — palette matches the source lockup */}
        <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <g fill="none" strokeWidth="3.8" strokeLinecap="round">
            <path d="M9 30 A 23 23 0 0 1 55 30" stroke="#2D7574" />
            <path d="M16 30 A 16 16 0 0 1 48 30" stroke="#2D7574" />
            <path d="M24 30 A 8 8 0 0 1 40 30" stroke="#2D7574" />
          </g>
          <g fill="none" stroke="#646D96" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M32 33 C 22 38, 20 50, 28 58 C 32 53, 34 46, 32 33 Z" />
            <path d="M32 33 C 42 38, 44 50, 36 58 C 32 53, 30 46, 32 33 Z" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}
