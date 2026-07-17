"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { MapaElectoralSecciones } from "@/components/MapaElectoralSecciones";
import { TOTAL_SECCIONES_COYOACAN } from "@/lib/secciones-electorales";

export default function ElectoralPage() {
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
          <h1 className="page-title">Mapa electoral</h1>
          <p className="page-subtitle">
            Casillas básicas y contiguas en las {TOTAL_SECCIONES_COYOACAN} secciones de Coyoacán.
          </p>
        </div>
      </div>

      <MapaElectoralSecciones />
    </div>
  );
}
