"use client";

import { useCallback, useEffect, useState } from "react";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  ESTADO_EVENTO_LABEL,
  type DirigenteOrganizacionRecordEnEvento,
  type EstadoEvento,
  type TipoOperacionEventoAsistencia,
} from "@/lib/asistencia";
import { TIPO_DIRIGENTE_LABEL, type TipoDirigente } from "@/lib/dirigentes";

function formatearFechaHoraRegistro(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

type Props = {
  eventoId: string;
  estadoEvento: EstadoEvento;
  tipoOperacion: TipoOperacionEventoAsistencia;
};

export function ConsultaDirigenteOrganizacionEvento({
  eventoId,
  estadoEvento,
  tipoOperacion,
}: Props) {
  const [buscar, setBuscar] = useState("");
  const [resultados, setResultados] = useState<DirigenteOrganizacionRecordEnEvento[]>([]);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esMovilizacion = tipoOperacion === "MOVILIZACION";

  const ejecutarBusqueda = useCallback(
    async (texto: string) => {
      const q = texto.trim();
      if (q.length < 2) {
        setResultados([]);
        setSeleccionId(null);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch(
          `/api/asistencia/eventos/${eventoId}/consulta-organizacion?${new URLSearchParams({ buscar: q })}`,
        );
        if (!res.ok) throw new Error("No se pudo buscar");
        const data = (await res.json()) as { resultados: DirigenteOrganizacionRecordEnEvento[] };
        setResultados(data.resultados);
        if (data.resultados.length === 1) {
          setSeleccionId(data.resultados[0].id);
        } else {
          setSeleccionId((prev) =>
            prev && data.resultados.some((r) => r.id === prev) ? prev : null,
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al buscar");
        setResultados([]);
        setSeleccionId(null);
      } finally {
        setLoading(false);
      }
    },
    [eventoId],
  );

  useEffect(() => {
    const t = window.setTimeout(() => void ejecutarBusqueda(buscar), 280);
    return () => window.clearTimeout(t);
  }, [buscar, ejecutarBusqueda]);

  const seleccionado = seleccionId ? resultados.find((r) => r.id === seleccionId) : null;

  return (
    <div className="card-section space-y-3">
      <h2 className="section-title">Consulta de dirigente en el evento</h2>
      <p className="text-sm text-ink-secondary">
        Busca cualquier dirigente (D1–D4, transversal, administrativo, entidad o partido político) y
        revisa solo su registro en este evento ({ESTADO_EVENTO_LABEL[estadoEvento].toLowerCase()}).
      </p>
      <label className="block">
        <span className="label">Buscar por nombre, ficha, sección o colonia</span>
        <input
          type="search"
          className="input input-search mt-1"
          placeholder="Ej. García, D2, ficha 123, colonia…"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          autoComplete="off"
        />
      </label>

      {loading ? (
        <p className="text-sm text-ink-secondary">Buscando…</p>
      ) : null}
      {error ? <p className="alert-error text-sm">{error}</p> : null}

      {!loading && buscar.trim().length >= 2 && resultados.length === 0 && !error ? (
        <p className="text-sm text-ink-secondary">
          Sin coincidencias con dirigentes de alta activa.
        </p>
      ) : null}

      {resultados.length > 1 ? (
        <ul className="flex flex-col gap-1">
          {resultados.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-pin border px-3 py-2 text-left text-sm transition-colors",
                  seleccionId === r.id
                    ? "border-pin bg-pin-light/40"
                    : "border-line bg-panel hover:border-pin-medium",
                )}
                onClick={() => setSeleccionId(r.id)}
              >
                <span className="font-medium text-ink">{r.nombreCompleto}</span>
                <span className="text-ink-secondary">
                  {" "}
                  · {TIPO_DIRIGENTE_LABEL[r.tipo as TipoDirigente] ?? r.tipo}
                  {r.asistio
                    ? esMovilizacion
                      ? ` · Movilizó (${r.totalMovilizados ?? 0})`
                      : " · Pasó lista"
                    : " · Sin registro"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {seleccionado ? (
        <div className="panel-soft space-y-3 p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold text-ink">{seleccionado.nombreCompleto}</p>
              <p className="mt-0.5 text-ink-secondary">
                {TIPO_DIRIGENTE_LABEL[seleccionado.tipo as TipoDirigente] ?? seleccionado.tipo} ·{" "}
                {seleccionado.colonia || "—"}
                {seleccionado.seccionElectoral
                  ? ` · Sección ${seleccionado.seccionElectoral}`
                  : ""}
              </p>
            </div>
            {seleccionado.asistio ? (
              <span className="badge-pin shrink-0">
                {esMovilizacion ? "Con movilización" : "Pasó lista"}
              </span>
            ) : (
              <span className="badge-muted shrink-0">
                {estadoEvento === "CERRADO"
                  ? esMovilizacion
                    ? "Sin movilizar"
                    : "No pasó lista"
                  : "Pendiente en este evento"}
              </span>
            )}
          </div>

          {!seleccionado.elegibleEnEvento ? (
            <p className="text-xs text-ink-secondary">
              No figura en la lista de elegibles de este evento por alcance o tipo, pero aquí se
              muestran sus escaneos si los hubo.
            </p>
          ) : null}

          {esMovilizacion ? (
            <p className="font-medium text-pin tabular-nums">
              Total movilizado en este evento: {seleccionado.totalMovilizados ?? 0}
            </p>
          ) : (
            <p className="text-ink-secondary">
              {seleccionado.asistio ? (
                <>
                  Registrado por{" "}
                  <strong className="text-ink">
                    {seleccionado.registradoPor?.username ?? "—"}
                  </strong>
                  {seleccionado.registradoAt
                    ? ` · ${formatearFechaHoraRegistro(seleccionado.registradoAt)}`
                    : null}
                </>
              ) : (
                "Aún no hay escaneo de pase de lista en este evento."
              )}
            </p>
          )}

          {seleccionado.registros.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
                Registros en este evento ({seleccionado.registros.length})
              </p>
              <ul className="mobile-only-list space-y-2">
                {seleccionado.registros.map((reg) => (
                  <li key={reg.id} className="rounded-pin border border-line/60 bg-panel px-3 py-2">
                    <p className="text-xs text-ink-secondary">
                      {formatearFechaHoraRegistro(reg.registradoAt)}
                    </p>
                    <p className="text-ink-secondary">
                      {esMovilizacion ? (
                        <>
                          {reg.cantidad} persona{reg.cantidad === 1 ? "" : "s"} · Escaneó:{" "}
                          {reg.registradoPor?.username ?? "—"}
                        </>
                      ) : (
                        <>Escaneó: {reg.registradoPor?.username ?? "—"}</>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="desktop-only-table">
                <TableWrap>
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs text-ink-secondary">
                        <th className="py-2 pr-3">Fecha y hora</th>
                        {esMovilizacion ? (
                          <th className="py-2 pr-3 text-right">Personas</th>
                        ) : null}
                        <th className="py-2">Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seleccionado.registros.map((reg) => (
                        <tr key={reg.id} className="border-b border-line/60">
                          <td className="py-2 pr-3 text-xs text-ink-secondary whitespace-nowrap">
                            {formatearFechaHoraRegistro(reg.registradoAt)}
                          </td>
                          {esMovilizacion ? (
                            <td className="py-2 pr-3 text-right tabular-nums font-medium">
                              {reg.cantidad}
                            </td>
                          ) : null}
                          <td className="py-2 text-ink-secondary">
                            {reg.registradoPor?.username ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}