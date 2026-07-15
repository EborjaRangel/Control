"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { MapaCoberturaSecciones } from "@/components/MapaCoberturaSecciones";
import { TOTAL_SECCIONES_COYOACAN } from "@/lib/secciones-electorales";

export default function MapaPage() {
  const { isStaff } = useAuth();
  const router = useRouter();

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
            Cobertura de dirigentes activos en las {TOTAL_SECCIONES_COYOACAN} secciones
            electorales de Coyoacán.
          </p>
        </div>
      </div>

      <MapaCoberturaSecciones />
    </div>
  );
}
