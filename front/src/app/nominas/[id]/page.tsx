"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NominaDetalle } from "@/components/NominaDetalle";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import type { NominaDTO } from "@/lib/nominas";
import type { NominaFormValues } from "@/lib/validation";

export default function NominaDirigentePage() {
  const { id } = useParams<{ id: string }>();
  const { isStaff, user } = useAuth();
  const [nomina, setNomina] = useState<NominaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const canAccess = isStaff || canViewOwnDirigente(user, id);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await apiFetch(`/api/nominas/${id}`);
      if (!res.ok) {
        throw new Error("Nómina no encontrada");
      }
      setNomina((await res.json()) as NominaDTO);
    } catch (err) {
      if (!options?.silent) {
        setError(err instanceof Error ? err.message : "Error al cargar");
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    if (!canAccess) return;
    void load();
  }, [load, canAccess]);

  async function handleSave(values: NominaFormValues) {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await apiFetch(`/api/nominas/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptosComposicion: (values.conceptosComposicion ?? []).map((c) => ({
            concepto: c.concepto,
            monto: Number(c.monto),
            nombre: c.nombre?.trim() || null,
            tipoDetalle: c.tipoDetalle?.trim() || null,
          })),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "No se pudo guardar la nómina");
      }
      const updated = (await res.json()) as NominaDTO;
      setNomina(updated);
      setSaved(true);
      await load({ silent: true });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!canAccess) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando nómina…
      </div>
    );
  }

  if (error || !nomina) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "No encontrado"}</div>
        {isStaff ? (
          <Link href="/nominas" className="btn-secondary btn-responsive">
            Volver a nóminas
          </Link>
        ) : user?.dirigenteId ? (
          <Link
            href={`/dirigentes/${user.dirigenteId}/consultar`}
            className="btn-secondary btn-responsive"
          >
            Volver a mi ficha
          </Link>
        ) : null}
      </div>
    );
  }

  const backHref = isStaff ? "/nominas" : `/dirigentes/${user?.dirigenteId}/consultar`;

  return (
    <div className="space-y-4">
      {saveError ? <div className="alert-error">{saveError}</div> : null}
      {saved ? (
        <div className="alert-success">Nómina guardada correctamente en la base de datos.</div>
      ) : null}
      <NominaDetalle
        nomina={nomina}
        editing={isStaff}
        saving={saving}
        onSave={isStaff ? handleSave : undefined}
        backHref={backHref}
      />
    </div>
  );
}
