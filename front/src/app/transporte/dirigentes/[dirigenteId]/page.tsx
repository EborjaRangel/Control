"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { UploadImage } from "@/components/UploadImage";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import {
  formatRegistroTransporteFecha,
  type DirigenteTransportePanelDTO,
} from "@/lib/transporte";

export default function DirigenteTransportePage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const searchParams = useSearchParams();
  const acabaDeRegistrar = searchParams.get("registrado") === "1";
  const { isStaff, user } = useAuth();
  const canAccess = isStaff || canViewOwnDirigente(user, dirigenteId);
  const esPropio = user?.dirigenteId === dirigenteId;
  const [panel, setPanel] = useState<DirigenteTransportePanelDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/transporte/dirigentes/${dirigenteId}`);
      if (!res.ok) throw new Error("Error al cargar");
      setPanel((await res.json()) as DirigenteTransportePanelDTO);
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

  if (!canAccess) return null;

  const volverHref = isStaff
    ? "/asistencia"
    : esPropio
      ? `/dirigentes/${dirigenteId}/consultar`
      : "/";

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

  const puedeRegistrar = esPropio && panel.eventosAbiertos.length > 0 && panel.dirigente.activo;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transporte</h1>
          <p className="page-subtitle">
            Registra camiones y microbuses vinculados a eventos de asistencia abiertos.
          </p>
        </div>
        <Link href={volverHref} className="btn-ghost btn-responsive">
          Volver
        </Link>
      </div>

      {acabaDeRegistrar ? (
        <div className="alert-success font-medium">
          El transporte quedó registrado. Aparece en el historial de abajo.
        </div>
      ) : null}

      {puedeRegistrar ? (
        <Link
          href={`/transporte/dirigentes/${dirigenteId}/nuevo`}
          className="btn-primary btn-responsive inline-flex items-center gap-2"
        >
          <AppIcon name="map" className="size-4 shrink-0" />
          Nueva captura de transporte
        </Link>
      ) : esPropio ? (
        <div className="alert-info">
          {panel.eventosAbiertos.length === 0
            ? "No hay eventos de asistencia abiertos. Cuando se abra un evento podrás registrar transporte."
            : "Tu ficha no está activa para registrar."}
        </div>
      ) : null}

      {panel.registros.length === 0 ? (
        <div className="alert-info">Aún no hay capturas de transporte registradas.</div>
      ) : (
        <ul className="space-y-4">
          {panel.registros.map((r) => (
            <li key={r.id} className="card-section space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">{r.eventoTitulo}</p>
                  <p className="text-sm text-ink-secondary">
                    {r.tipoUnidadLabel} · Placas {r.placas} · {r.tipoRecorridoLabel}
                  </p>
                  <p className="text-sm text-ink-secondary">
                    Chofer: {r.nombreChofer} · Tel. {r.telefonoChofer}
                  </p>
                  <p className="text-sm text-ink-secondary">Entrega: {r.puntoEntrega}</p>
                  <p className="mt-1 text-sm font-medium text-pin">
                    {formatRegistroTransporteFecha(r.registradoAt)}
                  </p>
                </div>
              </div>
              {r.fotos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {r.fotos.map((f) => (
                    <UploadImage
                      key={f.id}
                      src={f.url}
                      alt="Unidad"
                      width={96}
                      height={72}
                      className="size-20 rounded object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
