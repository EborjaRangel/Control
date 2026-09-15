"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const PUNTOS = [1, 2, 3, 4, 5] as const;

const SIZE = {
  sm: "size-4",
  md: "size-8",
  lg: "size-10",
} as const;

type Props = {
  value: number | string | null | undefined;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: keyof typeof SIZE;
};

function valorPuntos(value: Props["value"]) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(5, Math.round(n));
}

function EstrellaIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 2.5l2.85 6.16 6.75.74-5.05 4.62 1.4 6.58L12 17.27 5.05 20.6l1.4-6.58L1.4 9.4l6.75-.74L12 2.5z"
        fill={filled ? "#FFC043" : "#E4E4E4"}
        stroke={filled ? "#E6A800" : "#D0D0D0"}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalificacionEstrellas({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: Props) {
  const [hover, setHover] = useState(0);
  const actual = valorPuntos(value);
  const visible = hover || actual;
  const interactive = Boolean(onChange) && !readOnly;
  const iconClass = SIZE[size];

  if (!interactive) {
    return (
      <div
        className="inline-flex items-center gap-0.5"
        role="img"
        aria-label={actual ? `${actual} de 5 estrellas` : "Sin calificación"}
      >
        {PUNTOS.map((punto) => (
          <EstrellaIcon key={punto} filled={punto <= actual} className={iconClass} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="radiogroup"
      aria-label="Calificación de 1 a 5 estrellas"
      onMouseLeave={() => setHover(0)}
    >
      {PUNTOS.map((punto) => {
        const selected = punto <= visible;
        return (
          <button
            key={punto}
            type="button"
            role="radio"
            aria-checked={actual === punto}
            aria-label={`${punto} ${punto === 1 ? "estrella" : "estrellas"}`}
            className={cn(
              "rounded-full p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin",
              selected ? "drop-shadow-sm" : "",
            )}
            onMouseEnter={() => setHover(punto)}
            onFocus={() => setHover(punto)}
            onBlur={() => setHover(0)}
            onClick={() => onChange?.(punto)}
          >
            <EstrellaIcon filled={selected} className={iconClass} />
          </button>
        );
      })}
    </div>
  );
}
