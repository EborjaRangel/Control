"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ServicioUrbanoMapPicker } from "@/components/ServicioUrbanoMapPicker";
import { UploadImage } from "@/components/UploadImage";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import {
  formatRegistroTransporteFecha,
  type RegistroTransporteAdminDTO,
} from "@/lib/transporte";

export default function TransporteRegistroDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isStaff } = useAuth();
  const [registro, setRegistro] = useState<RegistroTransporteAdminDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isStaff) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    void apiFetch(`/api/transporte/registros/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Registro no encontrado");
        if (!cancelled) setRegistro((await res.json()) as RegistroTransporteAdminDTO);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isStaff, router]);

  if (!isStaff) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  if (error || !registro) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error ?? "No encontrado"}</div>
        <Link href="/transporte" className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registro de transporte</h1>
          <p className="page-subtitle">{formatRegistroTransporteFecha(registro.registradoAt)}</p>
        </div>
        <Link href="/transporte" className="btn-ghost btn-responsive">
          Volver al listado
        </Link>
      </div>

      <dl className="card-section grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="label">Dirigente</dt>
          <dd className="text-sm font-medium text-ink">{registro.dirigenteNombre}</dd>
          <dd className="text-xs text-ink-secondary">
            Sección {registro.dirigenteSeccion} · {registro.dirigenteColonia}
          </dd>
        </div>
        <div>
          <dt className="label">Evento</dt>
          <dd className="text-sm font-medium text-ink">{registro.eventoTitulo}</dd>
          <dd className="text-xs text-ink-secondary">{registro.eventoFecha}</dd>
        </div>
        <div>
          <dt className="label">Unidad</dt>
          <dd className="text-sm font-medium text-ink">
            {registro.tipoUnidadLabel} · Placas {registro.placas}
          </dd>
        </div>
        <div>
          <dt className="label">Chofer</dt>
          <dd className="text-sm font-medium text-ink">{registro.nombreChofer}</dd>
          <dd className="text-xs text-ink-secondary">Tel. {registro.telefonoChofer}</dd>
        </div>
        <div>
          <dt className="label">Recorrido</dt>
          <dd className="text-sm text-ink">{registro.tipoRecorridoLabel}</dd>
        </div>
        <div>
          <dt className="label">Punto de entrega</dt>
          <dd className="text-sm text-ink">{registro.puntoEntrega}</dd>
        </div>
      </dl>

      <section className="card-section space-y-4">
        <h2 className="section-title">Fotografías ({registro.fotos.length})</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {registro.fotos.map((f, i) => (
            <UploadImage
              key={f.id}
              src={f.url}
              alt={`Unidad ${i + 1}`}
              width={320}
              height={240}
              className="w-full rounded-pin object-cover max-h-64"
            />
          ))}
        </div>
      </section>

      <section className="card-section space-y-3">
        <h2 className="section-title">Ubicación de la captura</h2>
        <ServicioUrbanoMapPicker
          lat={registro.lat}
          lng={registro.lng}
          direccion={registro.puntoEntrega}
          readOnly
          onChange={() => {}}
        />
      </section>
    </div>
  );
}
