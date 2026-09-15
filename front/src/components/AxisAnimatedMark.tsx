"use client";

import { useId, useLayoutEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  variant?: "full" | "icon" | "stacked";
  mode?: "intro" | "idle" | "splash";
  theme?: "light" | "dark";
  /** Paleta del wordmark AXIS. El login usa azul; el pase de lista usa verde. */
  accent?: "blue" | "green";
  title?: string;
  size?: number;
};

/** Marca AXIS animada: X facetada, órbita y esfera. */
export function AxisAnimatedMark({
  className = "",
  variant = "full",
  mode = "idle",
  theme = "light",
  accent = "blue",
  title = "AXIS",
  size = 168,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const [reduceMotion, setReduceMotion] = useState(false);

  useLayoutEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  const viewBox =
    variant === "stacked" ? "0 0 280 220" : variant === "full" ? "0 0 360 120" : "0 0 120 120";
  const width = size;
  const height =
    variant === "stacked"
      ? Math.round(size * (220 / 280))
      : variant === "full"
        ? Math.round(size * (120 / 360))
        : size;

  return (
    <svg
      className={cn(
        "axis-logo",
        mode === "intro" && "axis-logo--intro",
        mode === "idle" && "axis-logo--idle",
        mode === "splash" && "axis-logo--splash",
        theme === "dark" && "axis-logo--dark",
        variant === "icon" && "axis-logo--icon",
        className,
      )}
      viewBox={viewBox}
      width={width}
      height={height}
      role="img"
      aria-label={title}
      style={{ width, height }}
    >
      <defs>
        <linearGradient id={`axis-x-cyan-${uid}`} x1="12%" y1="8%" x2="88%" y2="92%">
          <stop offset="0%" stopColor={theme === "dark" ? "#e7fbff" : "#9be7ff"} />
          <stop offset="42%" stopColor={theme === "dark" ? "#6ed4ff" : "#2bb4f0"} />
          <stop offset="100%" stopColor={theme === "dark" ? "#1a9be8" : "#0077c2"} />
        </linearGradient>
        <linearGradient id={`axis-x-navy-${uid}`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor={theme === "dark" ? "#9ad8ff" : "#4aa3e8"} />
          <stop offset="55%" stopColor={theme === "dark" ? "#3da6ee" : "#0055a4"} />
          <stop offset="100%" stopColor={theme === "dark" ? "#0b6fbf" : "#003366"} />
        </linearGradient>
        <linearGradient id={`axis-orbit-${uid}`} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#f2f9ff" />
          <stop offset="45%" stopColor="#7ec8ff" />
          <stop offset="100%" stopColor="#0055a4" />
        </linearGradient>
        <linearGradient id={`axis-word-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          {accent === "green" ? (
            <>
              <stop offset="0%" stopColor={theme === "dark" ? "#c8e6c9" : "#81c784"} />
              <stop offset="55%" stopColor={theme === "dark" ? "#66bb6a" : "#2e7d32"} />
              <stop offset="100%" stopColor={theme === "dark" ? "#2e7d32" : "#1b5e20"} />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor={theme === "dark" ? "#f4fbff" : "#3d9be8"} />
              <stop offset="55%" stopColor={theme === "dark" ? "#8fd4ff" : "#0055a4"} />
              <stop offset="100%" stopColor={theme === "dark" ? "#4aa3e8" : "#003366"} />
            </>
          )}
        </linearGradient>
        <radialGradient id={`axis-sphere-${uid}`} cx="32%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#f7fcff" />
          <stop offset="38%" stopColor="#5ec8ff" />
          <stop offset="100%" stopColor="#0055a4" />
        </radialGradient>
        <radialGradient id={`axis-glow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3db4ff" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#0055a4" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0055a4" stopOpacity="0" />
        </radialGradient>
        <filter id={`axis-soft-${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g transform={variant === "full" ? "translate(4 4)" : variant === "stacked" ? "translate(80 4)" : undefined}>
        <MarkGeometry uid={uid} spin={!reduceMotion} />
      </g>

      {variant === "full" ? (
        <g className="axis-wordmark">
          <text
            x="128"
            y="64"
            fill={`url(#axis-word-${uid})`}
            fontFamily="var(--font-geist-sans), system-ui, sans-serif"
            fontSize="42"
            fontWeight="800"
            letterSpacing="10"
          >
            AXIS
          </text>
          <text
            x="132"
            y="92"
            fill={theme === "dark" ? "#d5e9f8" : "#5a7a96"}
            fontFamily="var(--font-geist-sans), system-ui, sans-serif"
            fontSize="11"
            fontWeight="600"
            letterSpacing="1.4"
          >
            AI Xpert Integration Systems
          </text>
        </g>
      ) : null}

      {variant === "stacked" ? (
        <g className="axis-wordmark">
          <text
            x="140"
            y="156"
            textAnchor="middle"
            fill={`url(#axis-word-${uid})`}
            fontFamily="var(--font-geist-sans), system-ui, sans-serif"
            fontSize="44"
            fontWeight="800"
            letterSpacing="12"
          >
            AXIS
          </text>
          <text
            x="140"
            y="184"
            textAnchor="middle"
            fill={theme === "dark" ? "#d5e9f8" : "#5a7a96"}
            fontFamily="var(--font-geist-sans), system-ui, sans-serif"
            fontSize="11"
            fontWeight="600"
            letterSpacing="1.6"
          >
            AI Xpert Integration Systems
          </text>
        </g>
      ) : null}
    </svg>
  );
}

function MarkGeometry({
  uid,
  spin,
}: {
  uid: string;
  spin: boolean;
}) {
  return (
    <g className="axis-mark">
      <circle className="axis-glow" cx="56" cy="56" r="48" fill={`url(#axis-glow-${uid})`} />
      <g className="axis-x" filter={`url(#axis-soft-${uid})`}>
        <polygon points="28,18 46,18 90,94 72,94" fill={`url(#axis-x-navy-${uid})`} />
        <polygon points="70,18 88,18 44,94 26,94" fill={`url(#axis-x-cyan-${uid})`} />
        <polygon points="28,18 46,18 56,36 40,36" fill="#e7f7ff" opacity="0.42" />
        <polygon points="70,18 88,18 78,36 62,36" fill="#f4fbff" opacity="0.35" />
      </g>
      <g className="axis-orbit-spin">
        {spin ? (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 56 58"
            to="360 56 58"
            dur="7.5s"
            repeatCount="indefinite"
          />
        ) : null}
        <g transform="rotate(-32 56 58)">
          <ellipse
            className="axis-orbit-ring"
            cx="56"
            cy="58"
            rx="50"
            ry="20"
            fill="none"
            stroke={`url(#axis-orbit-${uid})`}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <ellipse
            className="axis-orbit-shine"
            cx="56"
            cy="58"
            rx="50"
            ry="20"
            fill="none"
            stroke="#f7fcff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="28 220"
            opacity="0.85"
          />
          <g className="axis-sphere">
            <circle
              cx="106"
              cy="58"
              r="7.2"
              fill={`url(#axis-sphere-${uid})`}
              filter={`url(#axis-soft-${uid})`}
            />
            <circle cx="103.6" cy="55.6" r="2.1" fill="#ffffff" opacity="0.78" />
          </g>
        </g>
      </g>
    </g>
  );
}
