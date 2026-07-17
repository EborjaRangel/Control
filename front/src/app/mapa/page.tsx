"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { MapaCoberturaSecciones } from "@/components/MapaCoberturaSecciones";
import { MapaElectoralSecciones } from "@/components/MapaElectoralSecciones";
import { cn } from "@/lib/cn";
import { TOTAL_SECCIONES_COYOACAN } from "@/lib/secciones-electorales";

type VistaMapa = "cobertura" | "casillas";

export default function MapaPage() {
  const { isStaff } = useAuth();
  const router = useRouter();
  const [vista, setVista] = useState<VistaMapa>("casillas");

  useEffect(() => {
    if (!isStaff) router.replace("/");
  }, [isStaff, router]);

  if (!isStaff) return null;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mapa de secciones</h1>
          <p className="page-subtitle">
            {vista === "casillas"
              ? `Casillas básicas y contiguas en las ${TOTAL_SECCIONES_COYOACAN} secciones de Coyoacán.`
              : `Cobertura de dirigentes activos en las ${TOTAL_SECCIONES_COYOACAN} secciones electorales de Coyoacán.`}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn("btn-responsive", vista === "casillas" ? "btn-primary" : "btn-secondary")}
          onClick={() => setVista("casillas")}
        >
          Casillas por sección
        </button>
        <button
          type="button"
          className={cn("btn-responsive", vista === "cobertura" ? "btn-primary" : "btn-secondary")}
          onClick={() => setVista("cobertura")}
        >
          Cobertura de dirigentes
        </button>
      </div>

      {vista === "casillas" ? <MapaElectoralSecciones /> : <MapaCoberturaSecciones />}
    </div>
  );
}
