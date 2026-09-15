"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AsambleaForm } from "@/components/AsambleaForm";
import { AsambleaSeccionMapPicker } from "@/components/AsambleaSeccionMapPicker";
import { UploadImage } from "@/components/UploadImage";
import { apiFetch } from "@/lib/api";
import { isAdminRol } from "@/lib/auth";
import {
  asambleaToFormValues,
  formatAsambleaFecha,
  type AsambleaDTO,
} from "@/lib/asambleas";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import type { AsambleaFormValues } from "@/lib/validation-asambleas";

export default function AsambleaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { isStaff, user } = useAuth();
  const isAdmin = isAdminRol(user?.rol);
  const [asamblea, setAsamblea] = useState<AsambleaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [observacion, setObservacion] = useState("");
  const [guardandoObs, setGuardandoObs] = useState(false);
  const [obsError, setObsError] = useState<string | null>(null);

  const canAccess =
    isStaff || (asamblea ? canViewOwnDirigente(user, asamblea.dirigenteId) : Boolean(user?.dirigenteId));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/asambleas/${id}`);
      if (!res.ok) throw new Error("Asamblea no encontrada");
      const data = (await res.json()) as AsambleaDTO;
      setAsamblea(data);
      setObservacion(data.observacion ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(values: AsambleaFormValues) {
    const res = await apiFetch(`/api/asambleas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error al guardar");
    }
    setAsamblea((await res.json()) as AsambleaDTO);
    setEditando(false);
  }

  async function handleGuardarObservacion() {
    setObsError(null);
    setGuardandoObs(true);
    try {
      const res = await apiFetch(`/api/asambleas/${id}/observacion`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observacion: observacion.trim() || null }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "No se pudo guardar");
      }
      setAsamblea((await res.json()) as AsambleaDTO);
    } catch (err) {
      setObsError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardandoObs(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  if (error || !asamblea || !canAccess) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "No encontrado"}</div>
        <Link href="/" className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  const backHref = `/asambleas/dirigentes/${asamblea.dirigenteId}`;
  const fotos = asamblea.fotos.slice(0, 10);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Asamblea</h1>
          <p className="page-subtitle">
            {formatAsambleaFecha(asamblea.fecha, asamblea.hora)} ·{" "}
            {etiquetaSeccion(asamblea.seccionElectoral)}
          </p>
        </div>
        <div className="page-actions">
          {!editando ? (
            <button type="button" className="btn-secondary btn-responsive" onClick={() => setEditando(true)}>
              Editar
            </button>
          ) : null}
          <Link href={backHref} className="btn-ghost btn-responsive">
            Volver al listado
          </Link>
        </div>
      </div>

      {editando ? (
        <AsambleaForm
          initialValues={asambleaToFormValues(asamblea)}
          seccionElectoral={asamblea.seccionElectoral}
          colonia={asamblea.dirigente?.colonia}
          onSubmit={handleSave}
          cancelHref={backHref}
          onCancel={() => setEditando(false)}
          submitLabel="Guardar cambios"
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-ink">{asamblea.cantidadConvocada}</p>
              <p className="text-xs text-ink-secondary">Cantidad convocada</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-pin">{asamblea.cantidadReal}</p>
              <p className="text-xs text-ink-secondary">Cantidad real</p>
            </div>
            <div className="card text-center sm:col-span-2">
              <p className="text-sm font-medium text-ink">{asamblea.lugar}</p>
              <p className="text-xs text-ink-secondary">Lugar</p>
            </div>
          </div>

          <section className="card-section space-y-4">
            <AsambleaSeccionMapPicker
              seccionElectoral={asamblea.seccionElectoral}
              colonia={asamblea.dirigente?.colonia}
              lat={asamblea.lat}
              lng={asamblea.lng}
              lugar={asamblea.lugar}
              readOnly
              onChange={() => {}}
            />
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Fotografías del evento</h2>
            {fotos.length === 0 ? (
              <p className="text-sm text-ink-secondary">Sin fotografías.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fotos.map((foto, index) => (
                  <UploadImage
                    key={foto.id}
                    src={foto.url}
                    alt={`Foto ${index + 1} de la asamblea`}
                    width={400}
                    height={260}
                    className="h-48 w-full rounded-pin object-cover ring-1 ring-line"
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Observación</h2>
            <p className="text-sm text-ink-secondary">
              Solo el administrador puede capturar la observación de esta asamblea.
            </p>
            {isAdmin ? (
              <>
                <textarea
                  className="input-area min-h-[120px]"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Observación del administrador…"
                />
                {obsError ? <div className="alert-error">{obsError}</div> : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn-primary btn-responsive"
                    disabled={guardandoObs}
                    onClick={() => void handleGuardarObservacion()}
                  >
                    {guardandoObs ? "Guardando…" : "Guardar observación"}
                  </button>
                </div>
              </>
            ) : asamblea.observacion ? (
              <p className="rounded-pin border border-line bg-surface-muted p-4 text-sm text-ink">
                {asamblea.observacion}
              </p>
            ) : (
              <p className="text-sm italic text-ink-secondary">Sin observación registrada.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
