"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AsambleaAdminForm } from "@/components/AsambleaAdminForm";
import { apiFetch } from "@/lib/api";
import {
  compararDirigentePorApellidosNombre,
  etiquetaApellidosNombre,
} from "@/lib/dirigentes";
import type { DirigenteDTO } from "@/lib/types";
import { EMPTY_ASAMBLEA_ADMIN, type AsambleaAdminFormValues } from "@/lib/validation-asambleas";

export default function NuevaAsambleaAdminPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [dirigentes, setDirigentes] = useState<
    { id: string; nombreCompleto: string; seccionElectoral: string; colonia: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    void apiFetch("/api/dirigentes?estatus=alta&orden=apellidos")
      .then(async (res) => {
        if (!res.ok) throw new Error("Error al cargar dirigentes");
        const data = (await res.json()) as DirigenteDTO[];
        setDirigentes(
          [...data].sort(compararDirigentePorApellidosNombre).map((d) => ({
            id: d.id,
            nombreCompleto: etiquetaApellidosNombre(d),
            seccionElectoral: d.seccionElectoral,
            colonia: d.colonia,
          })),
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false));
  }, [isAdmin, router]);

  async function handleSubmit(values: AsambleaAdminFormValues & { dirigenteId: string }) {
    const res = await apiFetch("/api/asambleas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al registrar");
    }
    const created = (await res.json()) as { id: string };
    router.push(`/asambleas/${created.id}`);
  }

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error}</div>
        <Link href="/asambleas" className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  const initialDirigente = dirigentes[0];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrar asamblea</h1>
          <p className="page-subtitle">
            Captura fecha, hora, lugar en mapa, asistencia, calificación y fotografías.
          </p>
        </div>
        <Link href="/asambleas" className="btn-ghost btn-responsive">
          Cancelar
        </Link>
      </div>

      <AsambleaAdminForm
        initialValues={{
          ...EMPTY_ASAMBLEA_ADMIN,
          seccionElectoral: initialDirigente?.seccionElectoral ?? "",
        }}
        dirigentes={dirigentes}
        onSubmit={handleSubmit}
        cancelHref="/asambleas"
        submitLabel="Registrar asamblea"
      />
    </div>
  );
}
