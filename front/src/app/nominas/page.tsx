"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { NOMBRES_COLONIAS_COYOACAN } from "@/lib/colonias";
import { formatMxn, TIPO_DIRIGENTE_LABEL, TIPOS_DIRIGENTE, CONCEPTO_SUELDO_LABEL, CONCEPTOS_SUELDO_CATALOGO } from "@/lib/dirigentes";
import { totalNomina, type NominaDTO } from "@/lib/nominas";

export default function NominasPage() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
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
      const res = await apiFetch(`/api/nominas?${params.toString()}`, { signal });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar nóminas");
      }
      setNominas((await res.json()) as NominaDTO[]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (signal?.aborted) return;
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [buscar, tipo, colonia]);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void load(controller.signal);
    }, buscar ? 300 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, buscar, tipo, colonia, pathname, isAdmin]);

  const totalMensual = useMemo(() => totalNomina(nominas), [nominas]);

  if (!isAdmin) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Nóminas</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : `${nominas.length} nómina(s) · Total mensual ${formatMxn(totalMensual)}`}
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
              <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-ink-secondary">
                  <th className="py-2 pr-3">Dirigente</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Colonia</th>
                  {CONCEPTOS_SUELDO_CATALOGO.map((key) => (
                    <th key={key} className="py-2 pr-3 text-right">
                      {CONCEPTO_SUELDO_LABEL[key]}
                    </th>
                  ))}
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {nominas.map((n) => {
                  const d = n.dirigente;
                  return (
                    <tr key={n.id} className="border-b border-line/60 hover:bg-surface-muted/50">
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/nominas/${n.dirigenteId}`}
                          className="font-medium text-pin hover:underline"
                        >
                          {d.nombreCompleto}
                        </Link>
                        {!d.activo ? (
                          <span className="ml-2 badge-muted text-[10px]">Baja</span>
                        ) : null}
                        <p className="mt-0.5 text-xs text-ink-secondary">
                          Sección {d.seccionElectoral}
                          {n.conceptosComposicion.length > 0
                            ? ` · ${n.conceptosComposicion.length} concepto(s)`
                            : " · Sin conceptos"}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3 text-ink-secondary">{d.tipo}</td>
                      <td className="py-2.5 pr-3 text-ink-secondary">{d.colonia}</td>
                      {CONCEPTOS_SUELDO_CATALOGO.map((key) => (
                        <td key={key} className="py-2.5 pr-3 text-right">
                          {formatMxn(n.desglose[key])}
                        </td>
                      ))}
                      <td className="py-2.5 pr-3 text-right font-bold text-pin">
                        {formatMxn(n.desglose.total)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Link href={`/nominas/${n.dirigenteId}`} className="btn-ghost btn-sm">
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
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
                        <dd className="font-medium text-ink">{formatMxn(n.desglose[key])}</dd>
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
