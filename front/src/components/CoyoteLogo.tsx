import Image from "next/image";
import { cn } from "@/lib/cn";
import { COYOTE_BLUE } from "@/lib/theme";

export { COYOTE_BLUE };

type Props = {
  size?: number;
  className?: string;
  title?: string;
  /** Fondo blanco detrás del emblema (sin anillo ni sombra). */
  badge?: boolean;
};

/**
 * Emblema oficial de perfil (Alcaldía Coyoacán) en azul (#1565C0).
 */
export function CoyoteLogo({
  size = 40,
  className = "",
  title = "Coyote de Coyoacán",
  badge = false,
}: Props) {
  const wrapperClass = cn(
    "inline-flex shrink-0 items-center justify-center",
    badge && "brand-mark",
    className,
  );

  return (
    <span className={wrapperClass} title={title}>
      <Image
        src="/coyote-emblem-blue.svg"
        alt={title}
        width={size}
        height={size}
        className="object-contain"
        priority
        unoptimized
      />
    </span>
  );
}
