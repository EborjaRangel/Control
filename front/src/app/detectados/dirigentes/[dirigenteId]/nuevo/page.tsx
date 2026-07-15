"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DetectadoForm } from "@/components/DetectadoForm";
import { apiFetch } from "@/lib/api";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import { EMPTY_DETECTADO, type DirigenteDetectadosDTO } from "@/lib/detectados";
import { canManageDetectadosDirigente } from "@/lib/mi-panel";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import type { DetectadoFormValues } from "@/lib/validation-detectado";

export default function NuevoDetectadoDirigentePage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const router = useRouter();
  const { isAdmin, user } = useAuth();
  const canAccess = isAdmin || canManageDetectadosDirigente(user, dirigenteId);
  const [dirigente, setDirigente] = useState<DirigenteDetectadosDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAccess) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/detectados/dirigentes/${dirigenteId}`);
        if (!res.ok) throw new Error("Dirigente no encontrado");
        const data = (await res.json()) as { dirigente: DirigenteDetectadosDTO };
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
          href={
            isAdmin
              ? "/detectados"
              : `/detectados/dirigentes/${dirigenteId}`
          }
          className="btn-secondary btn-responsive"
        >
          Volver
        </Link>
      </div>
    );
  }

  async function handleSubmit(values: DetectadoFormValues) {
    const res = await apiFetch("/api/detectados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        dirigenteId,
        segundoApellido: values.segundoApellido || null,
        telefonoCelular: values.telefonoCelular || null,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al crear");
    }
    await res.json();
    router.push(`/detectados/dirigentes/${dirigenteId}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nuevo detectado</h1>
          <p className="page-subtitle">
            Asignado a{" "}
            <span className="font-medium text-ink">{dirigente.nombreCompleto}</span> ·{" "}
            {TIPO_DIRIGENTE_LABEL[dirigente.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ??
              dirigente.tipo}{" "}
            · {etiquetaSeccion(dirigente.seccionElectoral)}
          </p>
        </div>
        <Link
          href={`/detectados/dirigentes/${dirigenteId}`}
          className="btn-ghost btn-responsive"
        >
          Cancelar
        </Link>
      </div>

      <p className="panel-soft text-sm text-ink-secondary">
        El detectado operará en la sección electoral del dirigente:{" "}
        <strong className="text-ink">{etiquetaSeccion(dirigente.seccionElectoral)}</strong>.
      </p>

      <DetectadoForm
        initialValues={{
          ...EMPTY_DETECTADO,
          seccionElectoral: dirigente.seccionElectoral,
        }}
        onSubmit={handleSubmit}
        cancelHref={`/detectados/dirigentes/${dirigenteId}`}
        submitLabel="Crear detectado"
        modo="crear"
        seccionFija={dirigente.seccionElectoral}
      />
    </div>
  );
}
