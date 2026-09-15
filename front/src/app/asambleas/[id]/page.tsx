"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AsambleaAdminForm } from "@/components/AsambleaAdminForm";
import { AsambleaSeccionMapPicker } from "@/components/AsambleaSeccionMapPicker";
import { CalificacionEstrellas } from "@/components/CalificacionEstrellas";
import { UploadImage } from "@/components/UploadImage";
import { apiFetch } from "@/lib/api";
import {
  asambleaToAdminFormValues,
  formatAsambleaFecha,
  type AsambleaDTO,
} from "@/lib/asambleas";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import type { AsambleaAdminFormValues } from "@/lib/validation-asambleas";

export default function AsambleaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin, isStaff, user } = useAuth();
  const [asamblea, setAsamblea] = useState<AsambleaDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const canAccess =
    isStaff || (asamblea ? canViewOwnDirigente(user, asamblea.dirigenteId) : Boolean(user?.dirigenteId));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/asambleas/${id}`);
      if (!res.ok) throw new Error("Asamblea no encontrada");
      setAsamblea((await res.json()) as AsambleaDTO);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!guardado) return;
    const timer = window.setTimeout(() => {
      router.push("/asambleas");
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [guardado, router]);

  async function handleSaveAdmin(values: AsambleaAdminFormValues & { dirigenteId: string }) {
    setGuardado(false);
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
    setGuardado(true);
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

  const backHref = isStaff
    ? "/asambleas"
    : `/asambleas/dirigentes/${asamblea.dirigenteId}`;
  const fotos = asamblea.fotos.slice(0, 10);
  const dirigenteOption = asamblea.dirigente
    ? [
        {
          id: asamblea.dirigenteId,
          nombreCompleto: asamblea.dirigente.nombreCompleto,
          seccionElectoral: asamblea.dirigente.seccionElectoral,
          colonia: asamblea.dirigente.colonia,
        },
      ]
    : [];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">{asamblea.titulo || "Asamblea"}</h1>
          <p className="page-subtitle">
            {formatAsambleaFecha(asamblea.fecha, asamblea.hora)} ·{" "}
            {etiquetaSeccion(asamblea.seccionElectoral)}
            {asamblea.dirigente ? ` · ${asamblea.dirigente.nombreCompleto}` : null}
          </p>
        </div>
        <div className="page-actions">
          <Link href={backHref} className="btn-ghost btn-responsive">
            Volver al listado
          </Link>
        </div>
      </div>

      {isAdmin ? (
        <AsambleaAdminForm
          initialValues={asambleaToAdminFormValues(asamblea)}
          dirigentes={dirigenteOption}
          dirigenteId={asamblea.dirigenteId}
          lockDirigente
          onSubmit={handleSaveAdmin}
          cancelHref={backHref}
          submitLabel="Guardar cambios"
          successMessage={guardado ? "Cambios guardados." : null}
        />
      ) : (
        <>
          {asamblea.descripcion ? (
            <section className="card-section">
              <h2 className="section-title">Descripción</h2>
              <p className="text-sm text-ink">{asamblea.descripcion}</p>
            </section>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="card text-center">
              <p className="text-2xl font-bold text-ink">{asamblea.cantidadConvocada}</p>
              <p className="text-xs text-ink-secondary">Personas requeridas</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-pin">{asamblea.cantidadReal}</p>
              <p className="text-xs text-ink-secondary">Personas que asistieron</p>
            </div>
            <div className="card flex flex-col items-center justify-center gap-1 py-4 text-center">
              <CalificacionEstrellas value={asamblea.calificacion} readOnly size="lg" />
              <p className="text-xs text-ink-secondary">Calificación</p>
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

          {asamblea.observacion ? (
            <section className="card-section space-y-4">
              <h2 className="section-title">Comentarios de la coordinación</h2>
              <p className="rounded-pin border border-line bg-surface-muted p-4 text-sm text-ink">
                {asamblea.observacion}
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
