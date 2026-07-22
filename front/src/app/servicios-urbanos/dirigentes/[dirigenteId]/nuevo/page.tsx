"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ServicioUrbanoForm } from "@/components/ServicioUrbanoForm";
import { apiFetch } from "@/lib/api";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import { EMPTY_SERVICIO_URBANO, type DirigenteServiciosUrbanosDTO } from "@/lib/servicios-urbanos";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import type { ServicioUrbanoFormValues } from "@/lib/validation-servicios-urbanos";

export default function NuevoServicioUrbanoPage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const router = useRouter();
  const { isStaff, user } = useAuth();
  const canAccess = isStaff || canViewOwnDirigente(user, dirigenteId);
  const [dirigente, setDirigente] = useState<DirigenteServiciosUrbanosDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAccess) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/servicios-urbanos/dirigentes/${dirigenteId}`);
        if (!res.ok) throw new Error("Dirigente no encontrado");
        const data = (await res.json()) as { dirigente: DirigenteServiciosUrbanosDTO };
        setDirigente(data.dirigente);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [dirigenteId, canAccess]);

  if (!canAccess) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  if (error || !dirigente) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "No encontrado"}</div>
        <Link
          href={`/servicios-urbanos/dirigentes/${dirigenteId}`}
          className="btn-secondary btn-responsive"
        >
          Volver
        </Link>
      </div>
    );
  }

  async function handleSubmit(values: ServicioUrbanoFormValues) {
    const res = await apiFetch("/api/servicios-urbanos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dirigenteId,
        tipo: values.tipo,
        descripcion: values.descripcion.trim() || null,
        lat: values.lat,
        lng: values.lng,
        fotoAntesUrl: values.fotoAntesUrl,
        fotoDespuesUrl: values.fotoDespuesUrl,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al crear");
    }
    router.push(`/servicios-urbanos/dirigentes/${dirigenteId}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nuevo reporte de servicio urbano</h1>
          <p className="page-subtitle">
            Dirigente{" "}
            <span className="font-medium text-ink">{dirigente.nombreCompleto}</span> ·{" "}
            {TIPO_DIRIGENTE_LABEL[dirigente.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ??
              dirigente.tipo}{" "}
            · {etiquetaSeccion(dirigente.seccionElectoral)}
          </p>
        </div>
        <Link
          href={`/servicios-urbanos/dirigentes/${dirigenteId}`}
          className="btn-ghost btn-responsive"
        >
          Cancelar
        </Link>
      </div>

      <ServicioUrbanoForm
        initialValues={EMPTY_SERVICIO_URBANO}
        onSubmit={handleSubmit}
        cancelHref={`/servicios-urbanos/dirigentes/${dirigenteId}`}
        submitLabel="Registrar reporte"
      />
    </div>
  );
}
