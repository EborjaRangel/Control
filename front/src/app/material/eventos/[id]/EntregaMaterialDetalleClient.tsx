"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { UploadImage } from "@/components/UploadImage";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import {
  ESTADO_ENTREGA_LABEL,
  badgeEstadoEntrega,
  formatFechaHoraMaterial,
  formatFechaMaterial,
  type PaseEntregaMaterialResponse,
  type ResumenDistritoEntrega,
} from "@/lib/material";
import { LIVE_PANEL_POLL_MS } from "@/lib/live-polling";

export default function EntregaMaterialDetalleClient() {
  const { id } = useParams<{ id: string }>();
  const { isStaff } = useAuth();
  const [data, setData] = useState<PaseEntregaMaterialResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [accionando, setAccionando] = useState(false);
  const [pestana, setPestana] = useState<"lista" | "distritos" | "recientes">("lista");
  const [distritoSel, setDistritoSel] = useState<number | "otros" | null>(null);
  const registrosPreviosRef = useRef(0);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await apiFetch(`/api/material/eventos/${id}/pase`);
      if (!res.ok) throw new Error("No se pudo cargar la entrega");
      setData((await res.json()) as PaseEntregaMaterialResponse);
    } catch (err) {
      if (opts?.silent) return;
      setError(err instanceof Error ? err.message : "Error");
      setData(null);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isStaff) void load();
  }, [isStaff, load]);

  useEffect(() => {
    if (!isStaff || data?.evento.estado !== "ABIERTO") return;
    const refrescar = () => {
      if (document.visibilityState === "hidden") return;
      void load({ silent: true });
    };
    const timer = window.setInterval(refrescar, LIVE_PANEL_POLL_MS);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [isStaff, data?.evento.estado, load]);

  useEffect(() => {
    const total = data?.registros.length ?? 0;
    if (total > registrosPreviosRef.current && registrosPreviosRef.current > 0) {
      setPestana("recientes");
    }
    registrosPreviosRef.current = total;
  }, [data?.registros.length]);

  useEffect(() => {
    if (data?.resumenDistritos.length && distritoSel === null) {
      setDistritoSel(data.resumenDistritos[0]?.distrito ?? null);
    }
  }, [data?.resumenDistritos, distritoSel]);

  async function abrirEntrega() {
    setAccionando(true);
    setMensaje(null);
    try {
      const res = await apiFetch(`/api/material/eventos/${id}/abrir`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo abrir");
      setMensaje("Entrega abierta. Escanea el QR de cada dirigente con la cámara del teléfono.");
      await load({ silent: true });
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error");
    } finally {
      setAccionando(false);
    }
  }

  async function cerrarEntrega() {
    if (!confirm("¿Cerrar la entrega? Ya no se podrán registrar más entregas por QR.")) return;
    setAccionando(true);
    setMensaje(null);
    try {
      const res = await apiFetch(`/api/material/eventos/${id}/cerrar`, { method: "POST" });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "No se pudo cerrar");
      setMensaje("Entrega cerrada.");
      await load({ silent: true });
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "Error");
    } finally {
      setAccionando(false);
    }
  }

  if (!isStaff) return null;

  if (loading) return <p className="text-ink-secondary">Cargando…</p>;
  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "No encontrado"}</div>
        <Link href="/material" className="btn-secondary btn-responsive inline-flex">
          Volver
        </Link>
      </div>
    );
  }

  const { evento, lista, resumenDistritos, registros } = data;
  const entregados = lista.filter((d) => d.entregado).length;
  const pendientes = lista.length - entregados;
  const distritoActivo: ResumenDistritoEntrega | undefined = resumenDistritos.find(
    (r) => r.distrito === distritoSel,
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="page-title break-words">{evento.titulo}</h1>
            <span className={badgeEstadoEntrega(evento.estado)}>{ESTADO_ENTREGA_LABEL[evento.estado]}</span>
          </div>
          <p className="page-subtitle">
            Vigencia: {formatFechaMaterial(evento.fechaInicio)} — {formatFechaMaterial(evento.fechaFin)}
          </p>
        </div>
        <div className="page-actions flex-wrap">
          {evento.estado === "PROGRAMADO" ? (
            <button type="button" className="btn-primary btn-responsive" disabled={accionando} onClick={() => void abrirEntrega()}>
              Abrir entrega
            </button>
          ) : null}
          {evento.estado === "ABIERTO" ? (
            <button type="button" className="btn-danger btn-responsive" disabled={accionando} onClick={() => void cerrarEntrega()}>
              Cerrar entrega
            </button>
          ) : null}
          <Link href="/material" className="btn-ghost btn-responsive">
            Volver
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-pin">{lista.length}</p>
          <p className="text-xs text-ink-secondary">Convocados</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-success-text">{entregados}</p>
          <p className="text-xs text-ink-secondary">Ya recogieron</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-ink">{pendientes}</p>
          <p className="text-xs text-ink-secondary">Pendientes</p>
        </div>
      </div>

      {evento.estado === "ABIERTO" ? (
        <div className="panel-pin text-sm text-pin-dark">
          Entrega abierta. El dirigente muestra su QR (misma credencial que asistencia). Al escanear, el teléfono
          mostrará <strong>Material entregado</strong>.
        </div>
      ) : null}

      {mensaje ? <div className="alert-success font-medium">{mensaje}</div> : null}

      <section className="card-section space-y-4">
        <div className="flex flex-wrap gap-2" role="tablist">
          <button
            type="button"
            className={cn("btn-responsive", pestana === "lista" ? "btn-primary" : "btn-secondary")}
            onClick={() => setPestana("lista")}
          >
            Lista general ({lista.length})
          </button>
          <button
            type="button"
            className={cn("btn-responsive", pestana === "distritos" ? "btn-primary" : "btn-secondary")}
            onClick={() => setPestana("distritos")}
          >
            Por distrito
          </button>
          <button
            type="button"
            className={cn("btn-responsive", pestana === "recientes" ? "btn-primary" : "btn-secondary")}
            onClick={() => setPestana("recientes")}
          >
            Recientes ({registros.length})
          </button>
        </div>

        {pestana === "lista" ? (
          <TableWrap>
            <table className="table-desktop">
              <thead>
                <tr>
                  <th>Dirigente</th>
                  <th>Distrito</th>
                  <th>Material</th>
                  <th>Estatus</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div className="font-medium">{d.nombreCompleto}</div>
                      <div className="text-xs text-ink-secondary">
                        {d.tipo} · {d.colonia}
                      </div>
                    </td>
                    <td>{d.distritoLabel}</td>
                    <td className="text-sm">
                      {d.materialesAsignados.map((m, i) => (
                        <div key={i}>
                          {m.cantidad}× {m.descripcion}
                        </div>
                      ))}
                    </td>
                    <td>
                      {d.entregado ? (
                        <span className="badge-pin">Entregado</span>
                      ) : (
                        <span className="badge-muted">Pendiente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : null}

        {pestana === "distritos" ? (
          <div className="space-y-4">
            <select
              className="input max-w-md"
              value={distritoSel ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setDistritoSel(v === "otros" ? "otros" : Number.parseInt(v, 10));
              }}
            >
              {resumenDistritos.map((r) => (
                <option key={String(r.distrito)} value={String(r.distrito)}>
                  {r.distritoLabel} — {r.entregados} entregados / {r.pendientes} pendientes
                </option>
              ))}
            </select>

            {distritoActivo ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="section-title text-base">Pendientes por recoger</h3>
                  <ul className="mobile-only-list mt-2">
                    {distritoActivo.pendientesLista.map((d) => (
                      <li key={d.id} className="list-card text-sm">
                        <p className="font-medium">{d.nombreCompleto}</p>
                        <p className="text-xs text-ink-secondary">{d.colonia} · Secc. {d.seccionElectoral}</p>
                      </li>
                    ))}
                    {distritoActivo.pendientesLista.length === 0 ? (
                      <p className="text-sm text-ink-secondary">Nadie pendiente en este distrito.</p>
                    ) : null}
                  </ul>
                </div>
                <div>
                  <h3 className="section-title text-base">Ya recogieron</h3>
                  <ul className="mobile-only-list mt-2">
                    {distritoActivo.entregadosLista.map((d) => (
                      <li key={d.id} className="list-card text-sm">
                        <p className="font-medium">{d.nombreCompleto}</p>
                        <p className="text-xs text-ink-secondary">
                          {d.registradoAt ? formatFechaHoraMaterial(d.registradoAt) : ""}
                        </p>
                      </li>
                    ))}
                    {distritoActivo.entregadosLista.length === 0 ? (
                      <p className="text-sm text-ink-secondary">Aún no hay entregas en este distrito.</p>
                    ) : null}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {pestana === "recientes" ? (
          <ul className="space-y-4">
            {registros.map((r) => (
              <li key={r.id} className="list-card">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{r.dirigenteNombre}</p>
                    <p className="text-sm text-ink-secondary">{formatFechaHoraMaterial(r.registradoAt)}</p>
                  </div>
                  <span className="badge-pin">Material entregado</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {r.lineas.map((l, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <UploadImage src={l.fotoUrl} alt="" width={64} height={48} className="size-12 rounded object-cover" />
                      <span>
                        {l.cantidad}× {l.descripcion}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
