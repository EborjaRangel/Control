"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/components/AuthProvider";
import { DetectadoForm } from "@/components/DetectadoForm";
import { apiFetch } from "@/lib/api";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import { EMPTY_DETECTADO, type DirigenteDetectadosDTO } from "@/lib/detectados";
import { canManageDetectadosDirigente } from "@/lib/mi-panel";
import { etiquetaSeccion, TOTAL_SECCIONES_COYOACAN } from "@/lib/secciones-electorales";
import type { DetectadoFormValues } from "@/lib/validation-detectado";

function NuevoDetectadoDirigentePage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isStaff, user } = useAuth();
  const canAccess = isStaff || canManageDetectadosDirigente(user, dirigenteId);
  const otrasSecciones = searchParams.get("ambito") === "otras";
  const pestana = otrasSecciones ? "otras" : "mi-seccion";
  const listHref = `/detectados/dirigentes/${dirigenteId}?pestana=${pestana}`;
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
          href={isStaff ? "/detectados" : `/detectados/dirigentes/${dirigenteId}`}
          className="btn-secondary btn-responsive"
        >
          Volver
        </Link>
      </div>
    );
  }

  const seccionDirigente = dirigente.seccionElectoral;

  async function handleSubmit(values: DetectadoFormValues) {
    const res = await apiFetch("/api/detectados", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        dirigenteId,
        curp: values.curp,
        segundoApellido: values.segundoApellido || null,
        telefonoCelular: values.telefonoCelular || null,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al crear");
    }
    await res.json();
    const destino =
      values.seccionElectoral === seccionDirigente ? "mi-seccion" : "otras";
    router.push(`/detectados/dirigentes/${dirigenteId}?pestana=${destino}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {otrasSecciones ? "Nuevo detectado · Otras secciones" : "Nuevo detectado · Mi sección"}
          </h1>
          <p className="page-subtitle">
            Asignado a{" "}
            <span className="font-medium text-ink">{dirigente.nombreCompleto}</span> ·{" "}
            {TIPO_DIRIGENTE_LABEL[dirigente.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ??
              dirigente.tipo}{" "}
            · {etiquetaSeccion(dirigente.seccionElectoral)}
          </p>
        </div>
        <Link href={listHref} className="btn-ghost btn-responsive">
          Cancelar
        </Link>
      </div>

      <p className="panel-soft text-sm text-ink-secondary">
        {otrasSecciones ? (
          <>
            Elige cualquiera de las {TOTAL_SECCIONES_COYOACAN} secciones electorales de Coyoacán.
            La sección asignada del dirigente es {etiquetaSeccion(dirigente.seccionElectoral)}.
          </>
        ) : (
          <>
            El detectado operará en la sección electoral del dirigente:{" "}
            <strong className="text-ink">{etiquetaSeccion(dirigente.seccionElectoral)}</strong>.
          </>
        )}
      </p>

      <DetectadoForm
        initialValues={{
          ...EMPTY_DETECTADO,
          seccionElectoral: otrasSecciones ? "" : dirigente.seccionElectoral,
        }}
        onSubmit={handleSubmit}
        cancelHref={listHref}
        submitLabel="Crear detectado"
        modo="crear"
        requiereVerificacionCurp
        seccionFija={otrasSecciones ? undefined : dirigente.seccionElectoral}
      />
    </div>
  );
}

export default function NuevoDetectadoDirigentePageSuspense() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando…
        </div>
      }
    >
      <NuevoDetectadoDirigentePage />
    </Suspense>
  );
}
