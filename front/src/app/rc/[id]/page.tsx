"use client";

import { UploadImage } from "@/components/UploadImage";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { canManageRc } from "@/lib/mi-panel";
import { nombreColoniaCatalogo } from "@/lib/colonias";
import type { RcDTO } from "@/lib/rc-rg";

export default function RcDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, user } = useAuth();
  const [rc, setRc] = useState<RcDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAccess = isAdmin || user?.rcId === id;
  const canEdit = canManageRc(user, id);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/rc/${id}`);
      if (!res.ok) throw new Error("No encontrado");
      setRc((await res.json()) as RcDTO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (canAccess) void load();
  }, [load, canAccess]);

  if (!canAccess && !loading) return null;
  if (loading) return <p className="text-ink-secondary">Cargando…</p>;
  if (error || !rc) return <div className="alert-error">{error ?? "No encontrado"}</div>;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">{rc.nombreCompleto}</h1>
          <p className="page-subtitle">
            Colonia {nombreColoniaCatalogo(rc.colonia)} · {rc.representantesRegistrados} representante(s)
            {rc.dirigente ? (
              <>
                {" · "}
                Dirigente:{" "}
                <Link
                  href={`/dirigentes/${rc.dirigente.id}/consultar`}
                  className="font-medium text-pin hover:underline"
                >
                  {rc.dirigente.nombreCompleto}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="page-actions">
          {canEdit ? (
            <Link href={`/rc/${id}/representantes/nueva`} className="btn-primary btn-responsive">
              + Registrar representante
            </Link>
          ) : null}
          {isAdmin ? <Link href="/rc" className="btn-ghost btn-responsive">Volver</Link> : null}
        </div>
      </div>

      {isAdmin ? (
        <section className="card-section space-y-4">
          <h2 className="section-title">Rep. Casilla</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-secondary">Nombre(s)</dt>
              <dd className="font-medium text-ink">{rc.nombre}</dd>
            </div>
            <div>
              <dt className="text-ink-secondary">Primer apellido</dt>
              <dd className="font-medium text-ink">{rc.primerApellido}</dd>
            </div>
            {rc.segundoApellido ? (
              <div>
                <dt className="text-ink-secondary">Segundo apellido</dt>
                <dd className="font-medium text-ink">{rc.segundoApellido}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-ink-secondary">Celular</dt>
              <dd className="font-medium text-ink">{rc.telefonoCelular ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-ink-secondary">Colonia asignada</dt>
              <dd className="font-medium text-ink">{nombreColoniaCatalogo(rc.colonia)}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section className="card-section space-y-4">
        <h2 className="section-title">Representantes de casilla</h2>
        {(rc.representantes?.length ?? 0) === 0 ? (
          <p className="text-sm text-ink-secondary">
            Sin representantes registrados.
            {canEdit ? (
              <>
                {" "}
                <Link
                  href={`/rc/${id}/representantes/nueva`}
                  className="font-medium text-pin hover:underline"
                >
                  Registrar el primero
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <>
            <ul className="mobile-only-list">
              {rc.representantes?.map((r) => (
                <li key={r.id} className="list-card">
                  <div className="list-card-header">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-ink">{r.nombreCompleto}</p>
                      <p className="mt-1 text-xs text-ink-secondary">
                        Sección {r.seccionElectoral} · {nombreColoniaCatalogo(r.colonia)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <UploadImage src={r.ineFrenteUrl} alt="Frente" width={40} height={28} className="h-7 w-10 rounded object-cover ring-1 ring-line" />
                      <UploadImage src={r.ineReversoUrl} alt="Reverso" width={40} height={28} className="h-7 w-10 rounded object-cover ring-1 ring-line" />
                    </div>
                  </div>
                  <Link href={`/rc/${id}/representantes/${r.id}`} className="btn-ghost btn-sm btn-responsive">
                    Ver detalle
                  </Link>
                </li>
              ))}
            </ul>

            <div className="desktop-only-table">
              <TableWrap>
                <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-secondary">
                  <th className="py-2 pr-3">Nombre</th>
                  <th className="py-2 pr-3">Sección</th>
                  <th className="py-2 pr-3">Colonia</th>
                  <th className="py-2 pr-3">INE</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {rc.representantes?.map((r) => (
                  <tr key={r.id} className="border-b border-line/60">
                    <td className="py-2.5 pr-3 font-medium">{r.nombreCompleto}</td>
                    <td className="py-2.5 pr-3 text-ink-secondary">{r.seccionElectoral}</td>
                    <td className="py-2.5 pr-3 text-ink-secondary">{nombreColoniaCatalogo(r.colonia)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex gap-1">
                        <UploadImage src={r.ineFrenteUrl} alt="Frente" width={40} height={28} className="h-7 w-10 rounded object-cover ring-1 ring-line" />
                        <UploadImage src={r.ineReversoUrl} alt="Reverso" width={40} height={28} className="h-7 w-10 rounded object-cover ring-1 ring-line" />
                      </div>
                    </td>
                    <td className="py-2.5 text-right">
                      <Link href={`/rc/${id}/representantes/${r.id}`} className="btn-ghost btn-sm">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </TableWrap>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
