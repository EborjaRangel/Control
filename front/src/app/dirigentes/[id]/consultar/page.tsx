"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DirigenteDetalle } from "@/components/DirigenteDetalle";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import type { DirigenteDTO } from "@/lib/types";

function enlaceRc(dirigenteId: string, rcId: string | null | undefined) {
  return rcId ? `/rc/${rcId}` : `/rc/por-dirigente/${dirigenteId}`;
}

function enlaceRg(dirigenteId: string, rgId: string | null | undefined) {
  return rgId ? `/rg/${rgId}` : `/rg/por-dirigente/${dirigenteId}`;
}

export default function ConsultarDirigentePage() {
  const { id } = useParams<{ id: string }>();
  const { isStaff, hasAdminPrivileges, user } = useAuth();
  const esPropio = canViewOwnDirigente(user, id);
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
    <div className="space-y-6 sm:space-y-8">
      {esPropio && dirigente.activo ? (
        <section className="card-section space-y-4">
          <div>
            <h2 className="section-title">Mis registros</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Administra detectados, representantes de casilla y representantes generales de tu
              equipo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/detectados/dirigentes/${id}`}
              className="btn-primary btn-responsive"
            >
              Mis detectados
            </Link>
            <Link href={enlaceRc(id, user?.rcId)} className="btn-secondary btn-responsive">
              {user?.rcId ? "Rep. de casilla" : "Activar Rep. Casilla"}
            </Link>
            <Link href={enlaceRg(id, user?.rgId)} className="btn-secondary btn-responsive">
              {user?.rgId ? "Rep. General" : "Activar Rep. General"}
            </Link>
          </div>
        </section>
      ) : null}

      <DirigenteDetalle
        dirigente={dirigente}
        editHref={isStaff ? `/dirigentes/${id}` : undefined}
        nominaHref={hasAdminPrivileges ? `/nominas/${id}` : undefined}
        backHref={isStaff ? "/" : undefined}
        showComposicionSueldo={hasAdminPrivileges}
      />
    </div>
  );
}
