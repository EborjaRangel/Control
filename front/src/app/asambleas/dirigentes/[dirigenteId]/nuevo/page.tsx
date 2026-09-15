"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AsambleaForm } from "@/components/AsambleaForm";
import { apiFetch } from "@/lib/api";
import { EMPTY_ASAMBLEA, type DirigenteAsambleasDTO } from "@/lib/asambleas";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import type { AsambleaFormValues } from "@/lib/validation-asambleas";

export default function NuevaAsambleaPage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const router = useRouter();
  const { isStaff, user } = useAuth();
  const canAccess = isStaff || canViewOwnDirigente(user, dirigenteId);
  const [dirigente, setDirigente] = useState<DirigenteAsambleasDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAccess) return;
    void apiFetch(`/api/asambleas/dirigentes/${dirigenteId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Dirigente no encontrado");
        const data = (await res.json()) as { dirigente: DirigenteAsambleasDTO };
        setDirigente(data.dirigente);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [dirigenteId, canAccess]);

  async function handleSubmit(values: AsambleaFormValues) {
    const res = await apiFetch("/api/asambleas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, dirigenteId }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al registrar");
    }
    const created = (await res.json()) as { id: string };
    router.push(`/asambleas/${created.id}`);
  }

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
        <Link href={`/asambleas/dirigentes/${dirigenteId}`} className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  const seccionAsamblea = dirigente.seccionElectoral;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrar asamblea</h1>
          <p className="page-subtitle">
            {dirigente.nombreCompleto} ·{" "}
            {TIPO_DIRIGENTE_LABEL[dirigente.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ??
              dirigente.tipo}{" "}
            · {etiquetaSeccion(dirigente.seccionElectoral)}
          </p>
        </div>
        <Link href={`/asambleas/dirigentes/${dirigenteId}`} className="btn-ghost btn-responsive">
          Cancelar
        </Link>
      </div>

      <p className="panel-soft text-sm text-ink-secondary">
        Ubica el lugar de la asamblea dentro del mapa de tu sección electoral (
        {etiquetaSeccion(seccionAsamblea)}).
      </p>

      <AsambleaForm
        initialValues={{ ...EMPTY_ASAMBLEA, seccionElectoral: seccionAsamblea }}
        seccionElectoral={seccionAsamblea}
        colonia={dirigente.colonia}
        onSubmit={handleSubmit}
        cancelHref={`/asambleas/dirigentes/${dirigenteId}`}
        submitLabel="Registrar asamblea"
      />
    </div>
  );
}
