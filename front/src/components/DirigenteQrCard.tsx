"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { formatFechaQr, urlQrAsistencia } from "@/lib/qr";
import { theme } from "@/lib/theme";

type Props = {
  codigoQr: string;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
  fechaNacimiento: string;
  qrPayload?: string;
  qrUrl?: string;
};

export function DirigenteQrCard({
  codigoQr,
  nombre,
  primerApellido,
  segundoApellido,
  fechaNacimiento,
}: Props) {
  const [contenidoQr, setContenidoQr] = useState("");
  const fechaFormateada = formatFechaQr(fechaNacimiento);

  useEffect(() => {
    setContenidoQr(urlQrAsistencia(codigoQr));
  }, [codigoQr]);

  return (
    <section className="card-section space-y-4">
      <div>
        <h2 className="section-title">Código QR de asistencia</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Este código se lee con la cámara de cualquier teléfono durante el pase de lista.
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-start">
        <div className="shrink-0 rounded-pin-lg border border-line bg-surface p-4 shadow-pin">
          {contenidoQr ? (
            <QRCode
              value={contenidoQr}
              size={180}
              level="M"
              bgColor={theme.surface}
              fgColor={theme.ink}
              title={`QR: ${nombre} ${primerApellido}`}
            />
          ) : (
            <div className="size-[180px] bg-surface-muted" />
          )}
        </div>

        <dl className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="label">Nombre(s)</dt>
            <dd className="break-words text-sm font-medium text-ink">{nombre}</dd>
          </div>
          <div>
            <dt className="label">Primer apellido</dt>
            <dd className="break-words text-sm font-medium text-ink">{primerApellido}</dd>
          </div>
          <div>
            <dt className="label">Segundo apellido</dt>
            <dd className="break-words text-sm font-medium text-ink">{segundoApellido || "—"}</dd>
          </div>
          <div>
            <dt className="label">Fecha de nacimiento</dt>
            <dd className="text-sm font-medium text-ink">{fechaFormateada}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
