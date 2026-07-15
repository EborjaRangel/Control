"use client";

import { CONCEPTO_SUELDO_LABEL, CONCEPTOS_SUELDO_CATALOGO, formatMxn } from "@/lib/composicion-sueldo";
import type { DesgloseSueldo } from "@/lib/composicion-sueldo";

type Props = {
  desglose: DesgloseSueldo;
};

export function SueldoDesglose({ desglose }: Props) {
  const rows = CONCEPTOS_SUELDO_CATALOGO.map((key) => ({
    label: CONCEPTO_SUELDO_LABEL[key],
    value: desglose[key],
  }));

  return (
    <div className="panel-pin">
      <h3 className="text-sm font-bold text-pin-dark">Desglose de sueldo</h3>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between text-ink-secondary">
            <dt>{row.label}</dt>
            <dd className="font-medium text-ink">{formatMxn(row.value)}</dd>
          </div>
        ))}
        <div className="divider flex justify-between pt-3 font-bold text-pin">
          <dt>Total mensual</dt>
          <dd>{formatMxn(desglose.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
