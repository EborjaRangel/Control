"use client";

import { formatMxn } from "@/lib/composicion-sueldo";
import { CONCEPTO_SUELDO_LABEL, CONCEPTOS_SUELDO_CATALOGO } from "@/lib/composicion-sueldo";
import type { NominaResumenGlobalDTO } from "@/lib/nominas";

type Props = {
  resumen: NominaResumenGlobalDTO;
};

export function NominaResumenGlobalPanel({ resumen }: Props) {
  const { desglose, nominasActivas } = resumen;

  return (
    <section className="card-section space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">Totales por concepto</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Resumen global de {nominasActivas} nómina(s) activa(s), persistido en base de datos.
          </p>
        </div>
        <div className="rounded-pin-lg border border-pin/30 bg-pin/5 px-4 py-3 text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
            Total general
          </p>
          <p className="text-2xl font-bold text-pin">{formatMxn(desglose.total)}</p>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONCEPTOS_SUELDO_CATALOGO.map((key) => (
          <div
            key={key}
            className="rounded-pin border border-line bg-surface px-4 py-3"
          >
            <dt className="text-xs text-ink-secondary">{CONCEPTO_SUELDO_LABEL[key]}</dt>
            <dd className="mt-1 text-lg font-semibold text-ink">{formatMxn(desglose[key])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
