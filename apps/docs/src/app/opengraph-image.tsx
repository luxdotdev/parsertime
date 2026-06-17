import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_SHORT_DESCRIPTION, SITE_URL } from "@/lib/site";

export const runtime = "edge";
export const alt = `${SITE_NAME} — Overwatch 2 scrim analytics reference`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 80px",
        background: "#1c1d20",
        color: "#fafafa",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Eyebrow row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontSize: 18,
          letterSpacing: 5,
          textTransform: "uppercase",
          color: "#9aa3ad",
        }}
      >
        <span style={{ width: 36, height: 1, background: "#3a3e44" }} />
        <span>docs</span>
        <span style={{ color: "#3a3e44" }}>·</span>
        <span style={{ color: "#d2d6dc" }}>parsertime / v3.0</span>
      </div>

      {/* Headline + description */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 88,
            lineHeight: 1.02,
            fontWeight: 700,
            letterSpacing: -2,
            maxWidth: 880,
          }}
        >
          The reference for v3.
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 26,
            lineHeight: 1.4,
            color: "#c5cad1",
            maxWidth: 880,
          }}
        >
          {SITE_SHORT_DESCRIPTION}
        </div>
      </div>

      {/* Footer ribbon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 18,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#9aa3ad",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "9999px",
              background: "#e8a23a",
            }}
          />
          <span>rec · live</span>
          <span style={{ width: 36, height: 1, background: "#3a3e44" }} />
          <span style={{ color: "#d2d6dc" }}>51 pages</span>
        </div>
        <div style={{ color: "#d2d6dc" }}>
          {SITE_URL.replace("https://", "")}
        </div>
      </div>
    </div>,
    { ...size }
  );
}
