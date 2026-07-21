"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DirigenteForm } from "@/components/DirigenteForm";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { apiJson } from "@/lib/api-response";
import { nombreCompleto } from "@/lib/dirigentes";
import { dtoToFormValues, type DirigenteDTO } from "@/lib/types";
import type { DirigenteFormValues } from "@/lib/validation";

export default function EditarDirigentePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasAdminPrivileges } = useAuth();
  const [dirigente, setDirigente] = useState<DirigenteDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(`/api/dirigentes/${id}`);
        if (!res.ok) {
          throw new Error("Dirigente no encontrado");
        }
        setDirigente((await res.json()) as DirigenteDTO);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  async function handleSubmit(values: DirigenteFormValues) {
    const res = await apiFetch(`/api/dirigentes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    await apiJson(res);
    router.push("/");
    router.refresh();
  }

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
        <Link href="/" className="btn-secondary btn-responsive">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="page-title break-words">Editar: {nombreCompleto(dirigente)}</h1>
        {!dirigente.activo ? (
          <p className="alert-warning mt-3">
            Este dirigente está dado de baja. Puedes editarlo y reactivarlo desde el listado.
          </p>
        ) : (
          <p className="page-subtitle">Actualiza la información del dirigente.</p>
        )}
      </div>
      <DirigenteForm
        initialValues={dtoToFormValues(dirigente)}
        onSubmit={handleSubmit}
        submitLabel="Guardar cambios"
        cancelHref="/"
        modo="editar"
        dirigenteId={id}
        showComposicionSueldo={hasAdminPrivileges}
      />
    </div>
  );
}
