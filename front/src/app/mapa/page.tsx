"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { MapaCoberturaSecciones } from "@/components/MapaCoberturaSecciones";
import { MapaElectoralSecciones } from "@/components/MapaElectoralSecciones";
import { MapaResultadosSecciones } from "@/components/MapaResultadosSecciones";
import { cn } from "@/lib/cn";
import { TOTAL_SECCIONES_COYOACAN } from "@/lib/secciones-electorales";

type VistaMapa = "casillas" | "cobertura" | "partido" | "coalicion";

const SUBTITULOS: Record<VistaMapa, string> = {
  casillas: `Casillas básicas y contiguas en las ${TOTAL_SECCIONES_COYOACAN} secciones de Coyoacán.`,
  cobertura: `Cobertura de dirigentes activos en las ${TOTAL_SECCIONES_COYOACAN} secciones electorales de Coyoacán.`,
  partido:
    "Partido ganador por sección en los cuatro procesos (sin agrupar coaliciones).",
  coalicion:
    "Coalición o partido ganador por sección en 2015, 2018, 2021 y 2024.",
};

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
          <p className="page-subtitle">{SUBTITULOS[vista]}</p>
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
        <button
          type="button"
          className={cn("btn-responsive", vista === "partido" ? "btn-primary" : "btn-secondary")}
          onClick={() => setVista("partido")}
        >
          Resultados por partido
        </button>
        <button
          type="button"
          className={cn("btn-responsive", vista === "coalicion" ? "btn-primary" : "btn-secondary")}
          onClick={() => setVista("coalicion")}
        >
          Resultados por coalición
        </button>
      </div>

      {vista === "casillas" ? <MapaElectoralSecciones /> : null}
      {vista === "cobertura" ? <MapaCoberturaSecciones /> : null}
      {vista === "partido" ? <MapaResultadosSecciones modo="partido" /> : null}
      {vista === "coalicion" ? <MapaResultadosSecciones modo="coalicion" /> : null}
    </div>
  );
}
