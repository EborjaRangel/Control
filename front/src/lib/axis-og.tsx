import { ImageResponse } from "next/og";
import type { CSSProperties, ReactElement } from "react";

const BLUE_START = "#0055a4";
const BLUE_END = "#003366";

export function axisMark(size: number): ReactElement {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `linear-gradient(135deg, ${BLUE_START} 0%, ${BLUE_END} 100%)`,
        borderRadius: Math.round(size * 0.22),
        color: "#ffffff",
        fontSize: Math.round(size * 0.5),
        fontWeight: 800,
        letterSpacing: "-0.06em",
      }}
    >
      A
    </div>
  );
}

export function axisIconImage(size: number) {
  const frame: CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: BLUE_END,
  };

  return new ImageResponse(
    (
      <div style={frame}>
        {axisMark(Math.round(size * 0.88))}
      </div>
    ),
    { width: size, height: size },
  );
}

export function axisOpenGraphImage() {
  const width = 1200;
  const height = 630;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: `linear-gradient(165deg, #04101c 0%, ${BLUE_END} 48%, ${BLUE_START} 100%)`,
          color: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
          }}
        >
          {axisMark(220)}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 96,
                fontWeight: 800,
                letterSpacing: 16,
                lineHeight: 1,
              }}
            >
              AXIS
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontSize: 28,
                letterSpacing: 2,
                opacity: 0.82,
              }}
            >
              Control de dirigentes · Coyoacán
            </div>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
