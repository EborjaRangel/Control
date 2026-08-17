import Image from "next/image";
import { cn } from "@/lib/cn";

type Props = {
  size?: number;
  className?: string;
  title?: string;
  /** Fondo blanco detrás del emblema. */
  badge?: boolean;
  /** Ícono cuadrado compacto (navbar) o logo completo con wordmark (login). */
  variant?: "full" | "icon";
};

/** Marca AXIS. */
export function AxisLogo({
  size = 120,
  className = "",
  title = "AXIS",
  badge = false,
  variant = "full",
}: Props) {
  const src = variant === "icon" ? "/axis-icon.svg" : "/axis-logo.svg";
  const height = variant === "icon" ? size : Math.round(size * 0.36);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        badge && "brand-mark rounded-pin px-3 py-2",
        className,
      )}
      title={title}
    >
      <Image
        src={src}
        alt={title}
        width={size}
        height={height}
        className="h-auto w-auto object-contain"
        style={{ width: size, height }}
        priority={variant === "full"}
        unoptimized
      />
    </span>
  );
}
