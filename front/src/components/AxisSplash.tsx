"use client";

import { useLayoutEffect, useState } from "react";
import { AxisAnimatedMark } from "@/components/AxisAnimatedMark";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "axis-intro-played";
const HOLD_MS = 4200;
const FADE_MS = 800;

type Props = {
  accent?: "blue" | "green";
};

/** Intro cinematográfica de marca al entrar al sitio (una vez por sesión). */
export function AxisSplash({ accent = "blue" }: Props) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const force = new URLSearchParams(window.location.search).get("intro") === "1";
    if (reduce) return;
    if (!force && sessionStorage.getItem(STORAGE_KEY) === "1") return;

    setVisible(true);
    sessionStorage.setItem(STORAGE_KEY, "1");

    const fade = window.setTimeout(() => setLeaving(true), HOLD_MS);
    const hide = window.setTimeout(() => setVisible(false), HOLD_MS + FADE_MS);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "axis-splash fixed inset-0 z-[80] flex items-center justify-center overflow-hidden",
        leaving && "axis-splash--out",
      )}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background:
          "radial-gradient(ellipse at 50% 42%, rgba(0, 85, 164, 0.42), transparent 62%), linear-gradient(165deg, #02080f 0%, #031422 48%, #000 100%)",
      }}
      role="presentation"
      aria-hidden
    >
      <div className="axis-splash-glow" />
      <div className="axis-splash-glow axis-splash-glow--alt" />
      <AxisAnimatedMark variant="stacked" mode="splash" theme="dark" accent={accent} size={300} />
    </div>
  );
}
