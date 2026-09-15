import { AxisAnimatedMark } from "@/components/AxisAnimatedMark";
import { cn } from "@/lib/cn";

type Props = {
  size?: number;
  className?: string;
  title?: string;
  /** Fondo blanco detrás del emblema. */
  badge?: boolean;
  /** Ícono cuadrado compacto (navbar) o logo completo con wordmark (login). */
  variant?: "full" | "icon";
  /** intro en login, idle en navbar y estados ya montados. */
  mode?: "intro" | "idle";
  /** Wordmark AXIS: azul en login, verde en pase de lista. */
  accent?: "blue" | "green";
};

/** Marca AXIS. */
export function AxisLogo({
  size = 120,
  className = "",
  title = "AXIS",
  badge = false,
  variant = "full",
  mode,
  accent = "blue",
}: Props) {
  const resolvedMode = mode ?? (variant === "full" ? "intro" : "idle");
  const markSize = variant === "icon" ? size : Math.round(size * 1.45);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        badge && "brand-mark rounded-pin px-3 py-2",
        className,
      )}
      title={title}
    >
      <AxisAnimatedMark
        variant={variant}
        mode={resolvedMode}
        theme="light"
        accent={accent}
        title={title}
        size={markSize}
      />
    </span>
  );
}
