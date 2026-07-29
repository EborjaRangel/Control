"use client";

import {
  CONCEPTO_SUELDO_LABEL,
  CONCEPTOS_SUELDO_CATALOGO,
  formatMxn,
  normalizarDesglose,
  type DesgloseSueldo,
} from "@/lib/composicion-sueldo";

type Props = {
  desglose: DesgloseSueldo;
  /** Resalta el total mensual como primera tarjeta. */
  showTotal?: boolean;
};

export function DesgloseConceptosResumen({ desglose, showTotal = true }: Props) {
  const normalizado = normalizarDesglose(desglose);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
      {showTotal ? (
        <div className="card text-center sm:col-span-2 lg:col-span-1">
          <p className="text-xl font-bold text-pin">{formatMxn(normalizado.total)}</p>
          <p className="text-xs text-ink-secondary">Total mensual</p>
        </div>
      ) : null}
      {CONCEPTOS_SUELDO_CATALOGO.map((key) => (
        <div key={key} className="card text-center">
          <p className="text-xl font-bold text-ink">{formatMxn(normalizado[key])}</p>
          <p className="text-xs text-ink-secondary">{CONCEPTO_SUELDO_LABEL[key]}</p>
        </div>
      ))}
    </div>
  );
}
