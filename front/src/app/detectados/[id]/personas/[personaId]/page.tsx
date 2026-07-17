"use client";

import { UploadImage } from "@/components/UploadImage";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { PersonaDetectadaForm } from "@/components/PersonaDetectadaForm";
import { apiFetch } from "@/lib/api";
import {
  personaToFormValues,
  type DetectadoDTO,
  type PersonaDetectadaDTO,
} from "@/lib/detectados";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import type { PersonaDetectadaFormValues } from "@/lib/validation-detectado";

export default function PersonaDetectadaDetallePage() {
  const { id, personaId } = useParams<{ id: string; personaId: string }>();
  const { isStaff, user } = useAuth();
  const canAccess = isStaff || Boolean(user?.dirigenteId);
  const [detectado, setDetectado] = useState<DetectadoDTO | null>(null);
  const [persona, setPersona] = useState<PersonaDetectadaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAccess) return;
    async function load() {
      try {
        const [detRes, perRes] = await Promise.all([
          apiFetch(`/api/detectados/${id}`),
          apiFetch(`/api/detectados/${id}/personas/${personaId}`),
        ]);
        if (!detRes.ok || !perRes.ok) throw new Error("No encontrado");
        setDetectado((await detRes.json()) as DetectadoDTO);
        setPersona((await perRes.json()) as PersonaDetectadaDTO);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id, personaId, canAccess]);

  async function handleSubmit(values: PersonaDetectadaFormValues) {
    const res = await apiFetch(`/api/detectados/${id}/personas/${personaId}`, {
      method: "PUT",
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
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al guardar");
    }
    setPersona((await res.json()) as PersonaDetectadaDTO);
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

  if (error || !persona || !detectado) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "No encontrado"}</div>
        <Link href={`/detectados/${id}`} className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{persona.nombreCompleto}</h1>
          <p className="page-subtitle">
            {etiquetaSeccion(persona.seccionElectoral)} · {persona.colonia}
          </p>
        </div>
        <Link href={`/detectados/${id}`} className="btn-ghost btn-responsive">
          Volver
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="label mb-2">Credencial anverso</p>
          <UploadImage
            src={persona.ineFrenteUrl}
            alt="Credencial anverso"
            width={400}
            height={250}
            className="w-full max-w-sm rounded-pin object-contain ring-1 ring-line"
          />
        </div>
        <div className="card">
          <p className="label mb-2">Credencial reverso</p>
          <UploadImage
            src={persona.ineReversoUrl}
            alt="Credencial reverso"
            width={400}
            height={250}
            className="w-full max-w-sm rounded-pin object-contain ring-1 ring-line"
          />
        </div>
      </div>

      <PersonaDetectadaForm
        initialValues={personaToFormValues(persona)}
        seccionAsignada={detectado.seccionElectoral}
        onSubmit={handleSubmit}
        cancelHref={`/detectados/${id}`}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
