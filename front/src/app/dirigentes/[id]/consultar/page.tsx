"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DirigenteDetalle } from "@/components/DirigenteDetalle";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import type { DirigenteDTO } from "@/lib/types";

export default function ConsultarDirigentePage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, user } = useAuth();
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
    <DirigenteDetalle
      dirigente={dirigente}
      editHref={isAdmin ? `/dirigentes/${id}` : undefined}
      nominaHref={
        canViewOwnDirigente(user, id) ? `/nominas/${id}` : isAdmin ? `/nominas/${id}` : undefined
      }
      backHref={isAdmin ? "/" : undefined}
    />
  );
}
