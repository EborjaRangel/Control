"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { EventoForm } from "@/components/EventoForm";
import { apiFetch } from "@/lib/api";
import type { EventoAsistenciaDTO } from "@/lib/asistencia";
import type { UnidadTerritorialResumen } from "@/lib/unidades-territoriales";
import {
  EMPTY_EVENTO,
  eventoFormToApiBody,
  type EventoFormValues,
} from "@/lib/validation-asistencia";

export default function NuevoEventoPage() {
  const router = useRouter();
  const { isStaff } = useAuth();
  const [uts, setUts] = useState<UnidadTerritorialResumen[]>([]);

  useEffect(() => {
    if (!isStaff) return;
    void apiFetch("/api/unidades-territoriales/catalogo")
      .then(async (res) => {
        if (!res.ok) return [];
        return (await res.json()) as UnidadTerritorialResumen[];
      })
      .then(setUts)
      .catch(() => setUts([]));
  }, [isStaff]);

  if (!isStaff) return null;

  async function handleSubmit(values: EventoFormValues) {
    const res = await apiFetch("/api/asistencia/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventoFormToApiBody(values)),
    });
    const data = (await res.json()) as EventoAsistenciaDTO & {
      error?: string;
      detalles?: string[];
    };
    if (!res.ok) {
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al crear");
    }
    router.push(`/asistencia/eventos/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="page-title">Nuevo evento</h1>
        <p className="page-subtitle">Captura los datos del evento y define el alcance del pase de lista.</p>
      </div>

      <EventoForm
        initialValues={EMPTY_EVENTO}
        onSubmit={handleSubmit}
        cancelHref="/asistencia"
        uts={uts}
      />
    </div>
  );
}
