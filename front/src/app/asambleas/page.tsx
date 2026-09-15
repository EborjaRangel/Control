"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import {
  etiquetaCalificacion,
  formatAsambleaFecha,
  type AsambleaDTO,
} from "@/lib/asambleas";

export default function AsambleasAdminListPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [asambleas, setAsambleas] = useState<AsambleaDTO[]>([]);
  const [buscar, setBuscar] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set("buscar", buscar.trim());
      const res = await apiFetch(`/api/asambleas?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar asambleas");
      setAsambleas((await res.json()) as AsambleaDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [buscar]);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    void load();
  }, [isAdmin, router, load]);

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Asambleas</h1>
          <p className="page-subtitle">
            Registro y calificación de asambleas con ubicación en mapa y evidencia fotográfica.
          </p>
        </div>
        <Link href="/asambleas/nuevo" className="btn-primary btn-responsive">
          + Registrar asamblea
        </Link>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-md flex-1"
          placeholder="Buscar por título, descripción, lugar o dirigente…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />
        <button type="button" className="btn-secondary btn-responsive" onClick={() => void load()}>
          Buscar
        </button>
      </div>

      <section className="card-section space-y-4">
        <h2 className="section-title">Asambleas registradas</h2>
        {asambleas.length === 0 ? (
          <p className="text-sm text-ink-secondary">No hay asambleas registradas.</p>
        ) : (
          <TableWrap>
            <table className="table-compact">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Dirigente</th>
                  <th>Fecha</th>
                  <th>Requeridas</th>
                  <th>Asistieron</th>
                  <th>Calificación</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {asambleas.map((a) => (
                  <tr key={a.id}>
                    <td className="font-medium">{a.titulo}</td>
                    <td>{a.dirigente?.nombreCompleto ?? "—"}</td>
                    <td>{formatAsambleaFecha(a.fecha, a.hora)}</td>
                    <td>{a.cantidadConvocada}</td>
                    <td>{a.cantidadReal}</td>
                    <td>{etiquetaCalificacion(a.calificacion)}</td>
                    <td className="text-right">
                      <Link href={`/asambleas/${a.id}`} className="btn-ghost btn-sm">
                        Ver / editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>
    </div>
  );
}
