"use client";

import QRCode from "react-qr-code";
import { formatFechaQr, payloadQrDirigente } from "@/lib/qr";
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
  qrPayload,
}: Props) {
  const contenidoQr =
    qrPayload ??
    payloadQrDirigente({
      codigoQr,
      nombre,
      primerApellido,
      segundoApellido,
      fechaNacimiento,
    });

  const fechaFormateada = formatFechaQr(fechaNacimiento);

  return (
    <section className="card-section space-y-4">
      <div>
        <h2 className="section-title">Código QR de asistencia</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Este código contiene los datos únicos del dirigente registrados en el sistema. Preséntalo en
          eventos para el pase de lista.
        </p>
      </div>

      <div className="flex flex-col items-center gap-5 lg:flex-row lg:items-start">
        <div className="shrink-0 rounded-pin-lg border border-line bg-surface p-4 shadow-pin">
          <QRCode
            value={contenidoQr}
            size={180}
            level="M"
            bgColor={theme.surface}
            fgColor={theme.ink}
            title={`QR: ${nombre} ${primerApellido}`}
          />
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
          <div className="sm:col-span-2">
            <dt className="label">Código único (base de datos)</dt>
            <dd className="break-all font-mono text-xs text-ink-secondary">{codigoQr}</dd>
          </div>
        </dl>
      </div>

      <p className="text-xs leading-relaxed text-ink-secondary">
        Al escanear, se consultan estos mismos datos en la base de datos para verificar la identidad del
        dirigente.
      </p>
    </section>
  );
}
