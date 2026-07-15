import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Contenedor con scroll horizontal táctil para tablas anchas. */
export function TableWrap({ children, className }: Props) {
  return (
    <div className={cn("table-wrap", className)} role="region" tabIndex={0} aria-label="Tabla desplazable">
      {children}
    </div>
  );
}
