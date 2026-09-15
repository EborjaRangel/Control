import { Suspense } from "react";
import RegistrarAsistenciaClient from "../asistencia/registrar/RegistrarAsistenciaClient";

export default function PaseListaPage() {
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
