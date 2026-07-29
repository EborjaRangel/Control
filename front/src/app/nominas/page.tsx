"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { NominaResumenGlobalPanel } from "@/components/NominaResumenGlobalPanel";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { NOMBRES_COLONIAS_COYOACAN } from "@/lib/colonias";
import { formatMxn, TIPO_DIRIGENTE_LABEL, TIPOS_DIRIGENTE, CONCEPTO_SUELDO_LABEL, CONCEPTOS_SUELDO_CATALOGO, normalizarDesglose } from "@/lib/dirigentes";
import { type NominaDTO, calcularResumenNominas } from "@/lib/nominas";

export default function NominasPage() {
  const pathname = usePathname();
  const { hasAdminPrivileges } = useAuth();
  const [nominas, setNominas] = useState<NominaDTO[]>([]);
  const [buscar, setBuscar] = useState("");
  const [tipo, setTipo] = useState("");
  const [colonia, setColonia] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set("buscar", buscar.trim());
      if (tipo) params.set("tipo", tipo);
      if (colonia) params.set("colonia", colonia);
      const requests: Promise<void>[] = [
        apiFetch(`/api/nominas?${params.toString()}`, { signal }).then(async (res) => {
          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error ?? "Error al cargar nóminas");
          }
          setNominas((await res.json()) as NominaDTO[]);
        }),
      ];
      await Promise.all(requests);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [buscar, tipo, colonia]);

  const hayFiltros = Boolean(tipo || colonia || buscar.trim());
  const resumen = useMemo(() => calcularResumenNominas(nominas), [nominas]);

  useEffect(() => {
    if (!hasAdminPrivileges) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void load(controller.signal);
    }, buscar ? 300 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, buscar, tipo, colonia, pathname, hasAdminPrivileges]);

  if (!hasAdminPrivileges) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nóminas</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : `${nominas.length} nómina(s) en la vista · Total ${formatMxn(resumen.desglose.total)}`}
          </p>
        </div>
      </div>

      <div className="card flex flex-col gap-4">
        <label className="w-full min-w-0 flex-1">
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre, sección o colonia…"
            className="input-search"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Tipo de dirigente</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="input mt-1"
            >
              <option value="">Todos (D1–D4)</option>
              {TIPOS_DIRIGENTE.map((t) => (
                <option key={t} value={t}>
                  {TIPO_DIRIGENTE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="label">Colonia</span>
            <select
              value={colonia}
              onChange={(e) => setColonia(e.target.value)}
              className="input mt-1"
            >
              <option value="">Todas las colonias</option>
              {NOMBRES_COLONIAS_COYOACAN.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {!loading && hasAdminPrivileges && (nominas.length > 0 || hayFiltros) ? (
        <NominaResumenGlobalPanel resumen={resumen} filtrado={hayFiltros} />
      ) : null}

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando nóminas…
        </div>
      ) : null}

      {!loading && nominas.length === 0 ? (
        <div className="card py-12 text-center">
          <p className="font-semibold text-ink">No hay nóminas registradas</p>
          <p className="mt-1 text-sm text-ink-secondary">
            Al crear o editar un dirigente se genera su nómina en la base de datos.
          </p>
          <Link href="/dirigentes/nuevo" className="btn-primary mt-6 inline-flex">
            Crear dirigente
          </Link>
        </div>
      ) : null}

      {!loading && nominas.length > 0 ? (
        <>
          <div className="card-section desktop-only-table">
            <TableWrap>
              <table className="w-full table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[10rem]" />
                <col className="w-9" />
                <col className="w-[4.5rem]" />
                {CONCEPTOS_SUELDO_CATALOGO.map((key) => (
                  <col key={key} className="w-[3.75rem]" />
                ))}
                <col className="w-[4.25rem]" />
                <col className="w-[4.75rem]" />
              </colgroup>
              <thead>
                <tr className="border-b border-line text-[10px] text-ink-secondary">
                  <th className="py-2 pr-1.5">Dirigente</th>
                  <th className="py-2 pr-1">Tipo</th>
                  <th className="py-2 pr-1">Colonia</th>
                  {CONCEPTOS_SUELDO_CATALOGO.map((key) => (
                    <th key={key} className="py-2 pr-1 text-right leading-tight">
                      {CONCEPTO_SUELDO_LABEL[key]}
                    </th>
                  ))}
                  <th className="sticky right-[4.75rem] z-10 bg-surface py-2 pr-1 text-right shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.08)]">
                    Total
                  </th>
                  <th className="sticky right-0 z-10 bg-surface py-2 shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.08)]" />
                </tr>
              </thead>
              <tbody>
                {nominas.map((n) => {
                  const d = n.dirigente;
                  return (
                    <tr key={n.id} className="group border-b border-line/60 hover:bg-surface-muted/50">
                      <td className="py-2 pr-1.5 align-top">
                        <Link
                          href={`/nominas/${n.dirigenteId}`}
                          className="block truncate font-medium text-pin hover:underline"
                          title={d.nombreCompleto}
                        >
                          {d.nombreCompleto}
                        </Link>
                        {!d.activo ? (
                          <span className="badge-muted text-[10px]">Baja</span>
                        ) : null}
                        <p className="mt-0.5 truncate text-[10px] text-ink-secondary" title={`Sección ${d.seccionElectoral}`}>
                          Sec. {d.seccionElectoral}
                        </p>
                      </td>
                      <td className="py-2 pr-1 text-ink-secondary">{d.tipo}</td>
                      <td
                        className="truncate py-2 pr-1 text-ink-secondary"
                        title={d.colonia}
                      >
                        {d.colonia}
                      </td>
                      {CONCEPTOS_SUELDO_CATALOGO.map((key) => (
                        <td key={key} className="whitespace-nowrap py-2 pr-1 text-right tabular-nums">
                          {formatMxn(normalizarDesglose(n.desglose)[key])}
                        </td>
                      ))}
                      <td className="sticky right-[4.75rem] z-10 whitespace-nowrap bg-surface py-2 pr-1 text-right font-bold tabular-nums text-pin shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.08)] group-hover:bg-surface-muted/50">
                        {formatMxn(n.desglose.total)}
                      </td>
                      <td className="sticky right-0 z-10 bg-surface py-2 text-right shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.08)] group-hover:bg-surface-muted/50">
                        <Link href={`/nominas/${n.dirigenteId}`} className="btn-ghost btn-sm whitespace-nowrap px-2">
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {hasAdminPrivileges && nominas.length > 0 ? (
                <tfoot>
                  <tr className="border-t-2 border-pin/30 bg-pin/5 font-semibold">
                    <td className="py-2.5 pr-1.5" colSpan={3}>
                      Totales por concepto
                    </td>
                    {CONCEPTOS_SUELDO_CATALOGO.map((key) => (
                      <td key={key} className="whitespace-nowrap py-2.5 pr-1 text-right tabular-nums text-pin">
                        {formatMxn(resumen.desglose[key])}
                      </td>
                    ))}
                    <td className="sticky right-[4.75rem] z-10 whitespace-nowrap bg-pin/5 py-2.5 pr-1 text-right text-sm tabular-nums text-pin shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.08)]">
                      {formatMxn(resumen.desglose.total)}
                    </td>
                    <td className="sticky right-0 z-10 bg-pin/5 py-2.5 shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.08)]" />
                  </tr>
                </tfoot>
              ) : null}
            </table>
            </TableWrap>
          </div>

          <ul className="mobile-only-list">
            {nominas.map((n) => {
              const d = n.dirigente;
              return (
                <Link
                  key={n.id}
                  href={`/nominas/${n.dirigenteId}`}
                  className="card-hover block space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-bold text-ink">{d.nombreCompleto}</h2>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {d.tipo} · {d.colonia} · Sección {d.seccionElectoral}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold text-pin">
                      {formatMxn(n.desglose.total)}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    {CONCEPTOS_SUELDO_CATALOGO.map((key) => (
                      <div key={key}>
                        <dt className="text-ink-secondary">{CONCEPTO_SUELDO_LABEL[key]}</dt>
                        <dd className="font-medium text-ink">
                          {formatMxn(normalizarDesglose(n.desglose)[key])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Link>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}
