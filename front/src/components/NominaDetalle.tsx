"use client";

import Link from "next/link";
import {
  CONCEPTO_SUELDO_LABEL,
  formatMxn,
  normalizarDesglose,
  TIPO_DIRIGENTE_LABEL,
  type TipoDirigente,
} from "@/lib/dirigentes";
import { tipoDetalleSueldoLabel } from "@/lib/composicion-sueldo";
import { type NominaDTO } from "@/lib/nominas";
import { TableWrap } from "@/components/TableWrap";
import { DesgloseConceptosResumen } from "@/components/DesgloseConceptosResumen";
import { NominaForm } from "@/components/NominaForm";
import { nominaToFormValues } from "@/lib/nominas";
import type { NominaFormValues } from "@/lib/validation";

type Props = {
  nomina: NominaDTO;
  editing?: boolean;
  saving?: boolean;
  onSave?: (values: NominaFormValues) => Promise<void>;
  backHref?: string;
};

export function NominaDetalle({
  nomina: n,
  editing = true,
  saving = false,
  onSave,
  backHref = "/nominas",
}: Props) {
  const d = n.dirigente;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">{d.nombreCompleto}</h1>
          <p className="page-subtitle">
            {TIPO_DIRIGENTE_LABEL[d.tipo as TipoDirigente] ?? d.tipo} · {d.colonia} · Sección{" "}
            {d.seccionElectoral}
          </p>
        </div>
        <div className="page-actions">
          <Link href={`/dirigentes/${n.dirigenteId}/consultar`} className="btn-secondary btn-responsive">
            Ver ficha
          </Link>
          {backHref ? (
            <Link href={backHref} className="btn-ghost btn-responsive">
              {backHref.startsWith("/dirigentes/") ? "Volver a mi ficha" : "Volver a nóminas"}
            </Link>
          ) : null}
        </div>
      </div>

      {!d.activo ? (
        <p className="alert-warning">Este dirigente está dado de baja.</p>
      ) : null}

      <DesgloseConceptosResumen desglose={n.desglose} />

      <section className="card-section space-y-4">
        <div>
          <h2 className="section-title">Conformación de la nómina</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Líneas de composición del sueldo registradas para este dirigente.
          </p>
        </div>

        {(n.conceptosComposicion?.length ?? 0) > 0 ? (
          <>
            <ul className="mobile-only-list">
              {n.conceptosComposicion.map((c) => (
                <li key={c.id} className="list-card">
                  <p className="font-medium text-ink">{CONCEPTO_SUELDO_LABEL[c.concepto]}</p>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <dt className="text-ink-secondary">Nombre</dt>
                      <dd className="font-medium text-ink">{c.nombre ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-secondary">Tipo</dt>
                      <dd className="font-medium text-ink">{tipoDetalleSueldoLabel(c.tipoDetalle)}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-ink-secondary">Monto</dt>
                      <dd className="font-bold text-pin">{formatMxn(c.monto)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
              <li className="list-card border-pin-muted bg-pin-light/30">
                <p className="flex items-center justify-between font-bold text-pin">
                  <span>Total mensual</span>
                  <span>{formatMxn(n.desglose.total)}</span>
                </p>
              </li>
            </ul>

            <div className="desktop-only-table">
              <TableWrap>
                <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-secondary">
                  <th className="py-2 pr-3">Concepto</th>
                  <th className="py-2 pr-3">Nombre</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {n.conceptosComposicion.map((c) => (
                  <tr key={c.id} className="border-b border-line/60">
                    <td className="py-2.5 pr-3 font-medium text-ink">
                      {CONCEPTO_SUELDO_LABEL[c.concepto]}
                    </td>
                    <td className="py-2.5 pr-3 text-ink-secondary">{c.nombre ?? "—"}</td>
                    <td className="py-2.5 pr-3 text-ink-secondary">{tipoDetalleSueldoLabel(c.tipoDetalle)}</td>
                    <td className="py-2.5 text-right font-medium text-ink">
                      {formatMxn(c.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line font-bold text-pin">
                  <td className="py-3 pr-3" colSpan={3}>
                    Total mensual
                  </td>
                  <td className="py-3 text-right">{formatMxn(n.desglose.total)}</td>
                </tr>
              </tfoot>
                </table>
              </TableWrap>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-secondary">Sin conceptos registrados.</p>
        )}
      </section>

      {editing && onSave ? (
        <NominaForm
          key={n.updatedAt}
          initialValues={nominaToFormValues(n)}
          saving={saving}
          onSubmit={onSave}
        />
      ) : null}
    </div>
  );
}
