import { Suspense } from "react";
import RegistrarAsistenciaClient from "./RegistrarAsistenciaClient";

export default function RegistrarAsistenciaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando…
        </div>
      }
    >
      <RegistrarAsistenciaClient />
    </Suspense>
  );
}
