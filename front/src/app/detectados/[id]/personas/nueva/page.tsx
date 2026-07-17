"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PersonaDetectadaForm } from "@/components/PersonaDetectadaForm";
import { apiFetch } from "@/lib/api";
import { EMPTY_PERSONA_DETECTADA, type DetectadoDTO } from "@/lib/detectados";
import type { PersonaDetectadaFormValues } from "@/lib/validation-detectado";

export default function NuevaPersonaDetectadaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isStaff, user } = useAuth();
  const canAccess = isStaff || Boolean(user?.dirigenteId);
  const [detectado, setDetectado] = useState<DetectadoDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canAccess) return;
    void apiFetch(`/api/detectados/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No encontrado");
        return (await res.json()) as DetectadoDTO;
      })
      .then(setDetectado)
      .finally(() => setLoading(false));
  }, [id, canAccess]);

  async function handleSubmit(values: PersonaDetectadaFormValues) {
    const res = await apiFetch(`/api/detectados/${id}/personas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        segundoApellido: values.segundoApellido || null,
        sexo: values.sexo || null,
        claveElector: values.claveElector || null,
        curp: values.curp || null,
        numeroInterior: values.numeroInterior || null,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al registrar");
    }
    router.push(`/detectados/${id}`);
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

  if (!detectado) {
    return (
      <div className="space-y-4">
        <div className="alert-error">Detectado no encontrado</div>
        <Link href="/detectados" className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrar persona</h1>
          <p className="page-subtitle">
            Detectado: {detectado.nombreCompleto} · Sección {detectado.seccionElectoral}
          </p>
        </div>
      </div>

      <PersonaDetectadaForm
        initialValues={{
          ...EMPTY_PERSONA_DETECTADA,
          seccionElectoral: detectado.seccionElectoral,
        }}
        seccionAsignada={detectado.seccionElectoral}
        onSubmit={handleSubmit}
        cancelHref={`/detectados/${id}`}
      />
    </div>
  );
}
