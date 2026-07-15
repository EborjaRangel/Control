import { cn } from "@/lib/cn";
import type { CSSProperties } from "react";

type Props = {
  value: number;
  className?: string;
  size?: "sm" | "md";
};

export function ProgressBar({ value, className, size = "md" }: Props) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn("progress-track", size === "sm" ? "h-1.5" : "h-2", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="progress-fill"
        style={{ "--progress": `${pct}%` } as CSSProperties}
      />
    </div>
  );
}
