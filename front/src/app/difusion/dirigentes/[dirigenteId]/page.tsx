"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { DifusionMapaAcciones } from "@/components/DifusionMapaAcciones";
import { TableWrap } from "@/components/TableWrap";
import { UploadImage } from "@/components/UploadImage";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import {
  campanaDifusionInicialDirigente,
  campanasDifusionParaDirigente,
  formatRegistroDifusionFecha,
  type DirigenteDifusionPanelDTO,
} from "@/lib/difusion";
import { numerosAccionPorRegistro } from "@/lib/difusion-numeracion";
import { etiquetaSeccion } from "@/lib/secciones-electorales";

export default function DirigenteDifusionPage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const { isStaff, user } = useAuth();
  const canAccess = isStaff || canViewOwnDirigente(user, dirigenteId);
  const [panel, setPanel] = useState<DirigenteDifusionPanelDTO | null>(null);
  const [campanaManual, setCampanaManual] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/difusion/dirigentes/${dirigenteId}`);
      if (!res.ok) throw new Error("Error al cargar");
      setPanel((await res.json()) as DirigenteDifusionPanelDTO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [dirigenteId]);

  useEffect(() => {
    if (!canAccess) return;
    void load();
  }, [load, canAccess]);

  const campanasOpciones = useMemo(
    () => (panel ? campanasDifusionParaDirigente(panel) : []),
    [panel],
  );

  const campanaId = useMemo(() => {
    if (!panel) return "";
    if (campanaManual && campanasOpciones.some((c) => c.id === campanaManual)) {
      return campanaManual;
    }
    return campanaDifusionInicialDirigente(panel);
  }, [panel, campanaManual, campanasOpciones]);

  const registrosCampana = useMemo(() => {
    if (!panel || !campanaId) return [];
    return panel.registros.filter((r) => r.campanaId === campanaId);
  }, [panel, campanaId]);

  const numerosAccion = useMemo(
    () => numerosAccionPorRegistro(registrosCampana),
    [registrosCampana],
  );

  if (!canAccess) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  if (error || !panel) {
    return <div className="alert-error">{error ?? "No encontrado"}</div>;
  }

  const d = panel.dirigente;
  const puedeRegistrar = !isStaff && panel.campanasActivas.length > 0 && d.activo;
  const campanaSeleccionada = campanasOpciones.find((c) => c.id === campanaId);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Difusión</h1>
          <p className="page-subtitle">
            {d.nombreCompleto} · {TIPO_DIRIGENTE_LABEL[d.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ?? d.tipo} ·{" "}
            {etiquetaSeccion(d.seccionElectoral)}
          </p>
        </div>
        <div className="page-actions">
          {puedeRegistrar ? (
            <Link
              href={`/difusion/dirigentes/${dirigenteId}/nuevo`}
              className="btn-primary btn-responsive"
            >
              <AppIcon name="camera" className="size-4 shrink-0" />
              Registrar acción
            </Link>
          ) : null}
          {!isStaff ? (
            <Link href={`/dirigentes/${dirigenteId}/consultar`} className="btn-ghost btn-responsive">
              Mi ficha
            </Link>
          ) : (
            <Link href="/difusion" className="btn-ghost btn-responsive">
              Admin difusión
            </Link>
          )}
        </div>
      </div>

      {panel.campanasActivas.length === 0 && campanasOpciones.length === 0 ? (
        <p className="panel-soft text-sm text-ink-secondary">
          No hay campañas activas ni registros previos. Cuando el administrador abra una campaña podrás registrar
          fotos aquí.
        </p>
      ) : null}

      <section className="card-section space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="section-title">Mis acciones en el mapa</h2>
            <p className="text-sm text-ink-secondary">
              Elige la campaña para ver solo tus globos numerados (1…N) en esa campaña.
            </p>
          </div>
          {campanasOpciones.length > 0 ? (
            <label className="block min-w-[min(100%,16rem)] sm:max-w-xs">
              <span className="label">Campaña</span>
              <select
                className="input mt-1"
                value={campanaId}
                onChange={(e) => setCampanaManual(e.target.value)}
              >
                {campanasOpciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titulo}
                    {c.activa ? "" : " (cerrada)"}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {campanaSeleccionada && !campanaSeleccionada.activa ? (
          <p className="text-sm text-ink-secondary">Campaña cerrada: solo consulta de registros.</p>
        ) : null}

        {campanaId ? (
          <DifusionMapaAcciones
            registros={registrosCampana}
            mostrarNumerosGlobo
            animacionAlCambiarKey={campanaId}
            detalleHref={(r) => `/difusion/registros/${r.id}`}
          />
        ) : (
          <p className="text-sm text-ink-secondary">Selecciona una campaña para ver el mapa.</p>
        )}
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">
          Registros
          {campanaSeleccionada ? ` — ${campanaSeleccionada.titulo}` : ""} ({registrosCampana.length})
        </h2>
        {registrosCampana.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            {campanaId
              ? "Aún no hay acciones en esta campaña."
              : "Selecciona una campaña para ver tus registros."}
          </p>
        ) : (
          <TableWrap>
            <table className="table-dense">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Foto</th>
                  <th>Fecha y hora</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {registrosCampana.map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold tabular-nums text-pin">
                      {numerosAccion.get(r.id) ?? "—"}
                    </td>
                    <td>
                      <UploadImage
                        src={r.fotoUrl}
                        alt=""
                        width={56}
                        height={42}
                        className="h-10 w-14 rounded object-cover"
                      />
                    </td>
                    <td>{formatRegistroDifusionFecha(r.registradoAt)}</td>
                    <td className="text-right">
                      <Link href={`/difusion/registros/${r.id}`} className="text-sm font-semibold text-pin hover:underline">
                        Ver
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
