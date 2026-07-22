"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { UploadImage } from "@/components/UploadImage";
import { useAuth } from "@/components/AuthProvider";
import { ServicioUrbanoForm } from "@/components/ServicioUrbanoForm";
import { ServicioUrbanoMapPicker } from "@/components/ServicioUrbanoMapPicker";
import { apiFetch } from "@/lib/api";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import {
  ESTATUS_SERVICIO_URBANO,
  estatusBadgeClass,
  formatReporteFecha,
  mapsUrl,
  type EstatusServicioUrbano,
  type ReporteServicioUrbanoDTO,
} from "@/lib/servicios-urbanos";
import type { ServicioUrbanoFormValues } from "@/lib/validation-servicios-urbanos";

function reporteToFormValues(r: ReporteServicioUrbanoDTO): ServicioUrbanoFormValues {
  return {
    tipo: r.tipo,
    descripcion: r.descripcion ?? "",
    direccion: r.direccion,
    lat: r.lat,
    lng: r.lng,
    fotoAntesUrl: r.fotoAntesUrl,
    fotoDespuesUrl: r.fotoDespuesUrl,
  };
}

export default function ServicioUrbanoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { isStaff, user } = useAuth();
  const [reporte, setReporte] = useState<ReporteServicioUrbanoDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [estatusDraft, setEstatusDraft] = useState<EstatusServicioUrbano>("ENVIADO");
  const [estatusSaving, setEstatusSaving] = useState(false);
  const [estatusError, setEstatusError] = useState<string | null>(null);

  const canLoad = isStaff || Boolean(user?.dirigenteId);
  const canManage =
    isStaff ||
    (reporte?.dirigenteId ? canViewOwnDirigente(user, reporte.dirigenteId) : false);

  const backHref = reporte?.dirigenteId
    ? `/servicios-urbanos/dirigentes/${reporte.dirigenteId}`
    : isStaff
      ? "/servicios-urbanos"
      : user?.dirigenteId
        ? `/servicios-urbanos/dirigentes/${user.dirigenteId}`
        : "/login";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/servicios-urbanos/${id}`);
      if (!res.ok) throw new Error("Reporte no encontrado");
      const data = (await res.json()) as ReporteServicioUrbanoDTO;
      setReporte(data);
      setEstatusDraft(data.estatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!canLoad) return;
    void load();
  }, [load, canLoad]);

  async function handleSave(values: ServicioUrbanoFormValues) {
    const res = await apiFetch(`/api/servicios-urbanos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: values.tipo,
        descripcion: values.descripcion.trim() || null,
        direccion: values.direccion.trim(),
        lat: values.lat,
        lng: values.lng,
        fotoAntesUrl: values.fotoAntesUrl,
        fotoDespuesUrl: values.fotoDespuesUrl,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al guardar");
    }
    setEditando(false);
    await load();
  }

  async function handleEstatusChange() {
    if (!reporte || estatusDraft === reporte.estatus) return;
    setEstatusSaving(true);
    setEstatusError(null);
    try {
      const res = await apiFetch(`/api/servicios-urbanos/${id}/estatus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estatus: estatusDraft }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string; detalles?: string[] };
        throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al actualizar estatus");
      }
      await load();
    } catch (err) {
      setEstatusError(err instanceof Error ? err.message : "Error al actualizar estatus");
    } finally {
      setEstatusSaving(false);
    }
  }

  async function toggleActivo(activo: boolean) {
    const url = activo
      ? `/api/servicios-urbanos/${id}?reactivar=true`
      : `/api/servicios-urbanos/${id}`;
    const res = await apiFetch(url, { method: "DELETE" });
    if (!res.ok) {
      alert("No se pudo actualizar el estado");
      return;
    }
    await load();
  }

  if (!canLoad) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  if (error || !reporte) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "No encontrado"}</div>
        <Link href="/servicios-urbanos" className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <p className="font-mono text-sm font-semibold text-pin">{reporte.folio}</p>
          <h1 className="page-title">{reporte.tipoLabel}</h1>
          <p className="page-subtitle">
            {reporte.dirigente?.nombreCompleto ?? "Dirigente"} ·{" "}
            {formatReporteFecha(reporte.createdAt)}
          </p>
        </div>
        <div className="page-actions">
          <Link href={backHref} className="btn-ghost btn-responsive">
            Volver
          </Link>
          {canManage && !editando ? (
            <button
              type="button"
              className="btn-secondary btn-responsive"
              onClick={() => setEditando(true)}
            >
              Editar
            </button>
          ) : null}
          {isStaff && reporte.activo ? (
            <button
              type="button"
              className="btn-ghost btn-responsive text-danger"
              onClick={() => void toggleActivo(false)}
            >
              Dar de baja
            </button>
          ) : null}
          {isStaff && !reporte.activo ? (
            <button
              type="button"
              className="btn-secondary btn-responsive"
              onClick={() => void toggleActivo(true)}
            >
              Reactivar
            </button>
          ) : null}
        </div>
      </div>

      {!reporte.activo ? <p className="alert-warning">Este reporte está dado de baja.</p> : null}

      <section className="card-section flex flex-wrap items-center gap-3">
        <span className={`${estatusBadgeClass(reporte.estatus)} text-sm`}>
          {reporte.estatusLabel}
        </span>
        <span className="text-sm text-ink-secondary">
          Actualizado {formatReporteFecha(reporte.estatusAt)}
        </span>
      </section>

      {isStaff && !editando ? (
        <section className="card-section space-y-4">
          <h2 className="section-title">Estatus del trámite</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="label min-w-[220px]">
              Cambiar estatus
              <select
                className="input"
                value={estatusDraft}
                onChange={(e) => setEstatusDraft(e.target.value as EstatusServicioUrbano)}
              >
                {ESTATUS_SERVICIO_URBANO.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-primary btn-responsive"
              disabled={estatusSaving || estatusDraft === reporte.estatus}
              onClick={() => void handleEstatusChange()}
            >
              {estatusSaving ? "Guardando…" : "Actualizar estatus"}
            </button>
          </div>
          {estatusError ? <div className="alert-error">{estatusError}</div> : null}
        </section>
      ) : null}

      {editando ? (
        <ServicioUrbanoForm
          initialValues={reporteToFormValues(reporte)}
          onSubmit={handleSave}
          cancelHref={backHref}
          onCancel={() => setEditando(false)}
          submitLabel="Guardar cambios"
        />
      ) : (
        <>
          {reporte.descripcion ? (
            <section className="card-section">
              <h2 className="section-title">Descripción</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{reporte.descripcion}</p>
            </section>
          ) : null}

          <section className="card-section space-y-4">
            <h2 className="section-title">Ubicación</h2>
            <ServicioUrbanoMapPicker
              lat={reporte.lat}
              lng={reporte.lng}
              direccion={reporte.direccion}
              onChange={() => {}}
              readOnly
            />
            <a
              href={mapsUrl(reporte.lat, reporte.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary btn-sm inline-flex"
            >
              Abrir en Google Maps
            </a>
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Fotografías</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="label mb-2">Antes</p>
                <UploadImage
                  src={reporte.fotoAntesUrl}
                  alt="Antes del servicio"
                  width={320}
                  height={200}
                  className="h-48 w-full max-w-md rounded-pin object-cover ring-2 ring-pin-light"
                />
              </div>
              <div>
                <p className="label mb-2">Después</p>
                <UploadImage
                  src={reporte.fotoDespuesUrl}
                  alt="Después del servicio"
                  width={320}
                  height={200}
                  className="h-48 w-full max-w-md rounded-pin object-cover ring-2 ring-pin-light"
                />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
