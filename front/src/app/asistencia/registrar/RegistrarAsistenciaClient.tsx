"use client";

import { UploadImage } from "@/components/UploadImage";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { formatFechaQr, type AsistenciaDirigenteResumen } from "@/lib/qr";

function CampoVerificacion({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="break-words text-sm font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}

export default function RegistrarAsistenciaClient() {
  const searchParams = useSearchParams();
  const codigo = searchParams.get("c")?.trim() ?? "";
  const { isAdmin, loading: authLoading } = useAuth();
  const [dirigente, setDirigente] = useState<AsistenciaDirigenteResumen | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAdmin || !codigo) {
      setDirigente(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void apiFetch(`/api/asistencia/dirigente/${encodeURIComponent(codigo)}`)
      .then(async (res) => {
        const data = (await res.json()) as AsistenciaDirigenteResumen & { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "No se pudo verificar el código QR");
        }
        return data;
      })
      .then((data) => {
        if (!cancelled) setDirigente(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al verificar");
          setDirigente(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAdmin, codigo]);

  if (authLoading) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Verificando sesión…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <div className="alert-warning">
          Solo un administrador puede registrar asistencia escaneando códigos QR.
        </div>
        <Link href="/" className="btn-secondary btn-responsive inline-flex">
          Volver al inicio
        </Link>
      </div>
    );
  }

  if (!codigo) {
    return (
      <div className="space-y-4">
        <h1 className="page-title">Registrar asistencia</h1>
        <div className="alert-error">Falta el código QR en la URL. Escanea un código válido.</div>
        <Link href="/" className="btn-secondary btn-responsive inline-flex">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="page-title">Registrar asistencia</h1>
        <p className="page-subtitle">Datos extraídos del QR y verificados en la base de datos</p>
      </div>

      {loading ? (
        <div className="card flex items-center gap-3 py-10 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Consultando base de datos…
        </div>
      ) : null}

      {error ? <div className="alert-error">{error}</div> : null}

      {dirigente ? (
        <article className="card-section space-y-5">
          <div className="flex items-start gap-4">
            {dirigente.fotoUrl ? (
              <UploadImage
                src={dirigente.fotoUrl}
                alt=""
                width={72}
                height={72}
                className="size-[72px] shrink-0 rounded-full object-cover ring-2 ring-pin-light"
              />
            ) : (
              <div className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-ink-secondary">
                Sin foto
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-ink">{dirigente.nombreCompleto}</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                {dirigente.tipo} · Sección {dirigente.seccionElectoral} · {dirigente.colonia}
              </p>
              {!dirigente.activo ? (
                <span className="badge-muted mt-2 inline-flex">Baja</span>
              ) : (
                <span className="badge-pin mt-2 inline-flex">Activo</span>
              )}
            </div>
          </div>

          <div className="panel-soft space-y-3">
            <p className="text-sm font-semibold text-ink">Identificación única (base de datos)</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <CampoVerificacion label="Nombre(s)" value={dirigente.nombre} />
              <CampoVerificacion label="Primer apellido" value={dirigente.primerApellido} />
              <CampoVerificacion
                label="Segundo apellido"
                value={dirigente.segundoApellido ?? "—"}
              />
              <CampoVerificacion
                label="Fecha de nacimiento"
                value={formatFechaQr(dirigente.fechaNacimiento)}
              />
            </dl>
          </div>

          <div className="panel-pin">
            <p className="text-sm font-medium text-pin-dark">
              Código QR verificado. Los datos coinciden con el registro único del dirigente en la base
              de datos.
            </p>
          </div>

          <Link
            href={`/dirigentes/${dirigente.id}/consultar`}
            className="btn-secondary btn-responsive inline-flex"
          >
            Ver ficha completa
          </Link>
        </article>
      ) : null}

      <Link href="/" className="btn-ghost btn-responsive inline-flex">
        Volver al listado
      </Link>
    </div>
  );
}
