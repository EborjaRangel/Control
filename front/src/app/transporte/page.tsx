"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { TableWrap } from "@/components/TableWrap";
import { TransporteMapaRegistros } from "@/components/TransporteMapaRegistros";
import { UploadImage } from "@/components/UploadImage";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import type { EventoAsistenciaDTO } from "@/lib/asistencia";
import {
  formatRegistroTransporteFecha,
  type RegistroTransporteAdminDTO,
} from "@/lib/transporte";

export default function TransporteAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isStaff } = useAuth();

  const eventoFiltro = searchParams.get("eventoId") ?? "";
  const buscarFiltro = searchParams.get("buscar") ?? "";

  const [eventos, setEventos] = useState<EventoAsistenciaDTO[]>([]);
  const [registros, setRegistros] = useState<RegistroTransporteAdminDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buscarInput, setBuscarInput] = useState(buscarFiltro);

  useEffect(() => {
    setBuscarInput(buscarFiltro);
  }, [buscarFiltro]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (eventoFiltro) params.set("eventoId", eventoFiltro);
      if (buscarFiltro) params.set("buscar", buscarFiltro);
      const qs = params.toString();

      const [resEventos, resRegistros] = await Promise.all([
        apiFetch("/api/asistencia/eventos"),
        apiFetch(`/api/transporte/registros/mapa${qs ? `?${qs}` : ""}`),
      ]);

      if (!resEventos.ok) throw new Error("Error al cargar eventos");
      if (!resRegistros.ok) throw new Error("Error al cargar registros");

      setEventos((await resEventos.json()) as EventoAsistenciaDTO[]);
      setRegistros((await resRegistros.json()) as RegistroTransporteAdminDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  }, [eventoFiltro, buscarFiltro]);

  useEffect(() => {
    if (!isStaff) {
      router.replace("/");
      return;
    }
    void load();
  }, [isStaff, router, load]);

  const eventosOpciones = useMemo(
    () => [...eventos].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [eventos],
  );

  function aplicarFiltros(next: { eventoId?: string; buscar?: string }) {
    const params = new URLSearchParams();
    const ev = next.eventoId ?? eventoFiltro;
    const bus = next.buscar ?? buscarFiltro;
    if (ev) params.set("eventoId", ev);
    if (bus) params.set("buscar", bus);
    const qs = params.toString();
    router.replace(qs ? `/transporte?${qs}` : "/transporte", { scroll: false });
  }

  if (!isStaff) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <AppIcon name="map" className="size-[1.15em] shrink-0 text-pin" />
            Transporte
          </h1>
          <p className="page-subtitle">
            Unidades registradas por dirigentes ·{" "}
            {loading ? "…" : `${registros.length} en mapa y tabla`}
          </p>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      <section className="card-section space-y-4">
        <h2 className="section-title">Filtros</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="min-w-[200px] flex-1">
            <span className="label">Evento de asistencia</span>
            <select
              className="input mt-1"
              value={eventoFiltro}
              onChange={(e) => aplicarFiltros({ eventoId: e.target.value })}
            >
              <option value="">Todos los eventos</option>
              {eventosOpciones.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.titulo} ({ev.fecha}) · {ev.estado}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[200px] flex-1">
            <span className="label">Buscar</span>
            <input
              className="input mt-1"
              value={buscarInput}
              onChange={(e) => setBuscarInput(e.target.value)}
              placeholder="Dirigente, placas, chofer, punto…"
              onKeyDown={(e) => {
                if (e.key === "Enter") aplicarFiltros({ buscar: buscarInput.trim() });
              }}
            />
          </label>
          <button
            type="button"
            className="btn-secondary btn-responsive"
            onClick={() => aplicarFiltros({ buscar: buscarInput.trim() })}
          >
            Buscar
          </button>
        </div>
      </section>

      <section className="card-section space-y-3">
        <h2 className="section-title">Mapa de capturas</h2>
        {loading ? (
          <p className="text-ink-secondary">Cargando mapa…</p>
        ) : (
          <TransporteMapaRegistros
            registros={registros}
            detalleHref={(r) => `/transporte/registros/${r.id}`}
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Registros</h2>
        <TableWrap>
          <table className="table-pin">
            <thead>
              <tr>
                <th>Dirigente</th>
                <th>Evento</th>
                <th>Unidad</th>
                <th>Chofer</th>
                <th>Entrega</th>
                <th>Fecha</th>
                <th>Fotos</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-ink-secondary">
                    {loading ? "Cargando…" : "No hay registros"}
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="font-medium text-ink">{r.dirigenteNombre}</div>
                      <div className="text-xs text-ink-secondary">
                        {r.dirigenteNumeroFicha != null ? `#${r.dirigenteNumeroFicha} · ` : ""}
                        {r.dirigenteColonia}
                      </div>
                    </td>
                    <td className="text-sm">{r.eventoTitulo}</td>
                    <td className="text-sm whitespace-nowrap">
                      {r.tipoUnidadLabel}
                      <br />
                      <span className="font-mono text-xs">{r.placas}</span>
                    </td>
                    <td className="text-sm">
                      {r.nombreChofer}
                      <br />
                      <span className="text-xs text-ink-secondary">{r.telefonoChofer}</span>
                    </td>
                    <td className="text-sm max-w-[140px] truncate" title={r.puntoEntrega}>
                      {r.puntoEntrega}
                    </td>
                    <td className="text-sm whitespace-nowrap">
                      {formatRegistroTransporteFecha(r.registradoAt)}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {r.fotos.slice(0, 3).map((f) => (
                          <UploadImage
                            key={f.id}
                            src={f.url}
                            alt=""
                            width={40}
                            height={32}
                            className="size-10 rounded object-cover"
                          />
                        ))}
                        {r.fotos.length > 3 ? (
                          <span className="text-xs text-ink-secondary self-center">
                            +{r.fotos.length - 3}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <Link href={`/transporte/registros/${r.id}`} className="btn-ghost btn-sm">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableWrap>
      </section>
    </div>
  );
}
