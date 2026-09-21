"use client";

import { UploadImage } from "@/components/UploadImage";
import { DirigenteEstatusAltaIcon } from "@/components/DirigenteEstatusAltaIcon";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { esAbortError, mensajeErrorRed } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { NOMBRES_COLONIAS_COYOACAN, variantesColoniaParaBusqueda } from "@/lib/colonias";
import {
  TIPO_DIRIGENTE_LABEL,
  TIPOS_DIRIGENTE,
} from "@/lib/dirigentes";
import { esDirigenteBaja, STATUS_DIRIGENTE_LABEL } from "@/lib/dirigente-spec";
import { normalizarTextoGuardado } from "@/lib/normalizar-texto";
import type { DirigenteDTO } from "@/lib/types";

const TAMANO_PAGINA = 24;

function claveListadoDirigentes(incluirBajas: boolean, buscar: string, tipo: string) {
  return `${incluirBajas ? "baja" : "alta"}|${buscar.trim().toLowerCase()}|${tipo || "todos"}`;
}

function coincideTipoFiltro(tipoDirigente: string, tipoFiltro: string) {
  if (!tipoFiltro) return true;
  return tipoDirigente.trim().toUpperCase() === tipoFiltro.trim().toUpperCase();
}

function coincideColoniaFiltro(coloniaDirigente: string, coloniaFiltro: string) {
  if (!coloniaFiltro) return true;
  const variantes = variantesColoniaParaBusqueda(coloniaFiltro).map((v) =>
    normalizarTextoGuardado(v),
  );
  return variantes.includes(normalizarTextoGuardado(coloniaDirigente));
}

export default function DirigentesPage() {
  const pathname = usePathname();
  const { isStaff } = useAuth();
  const [dirigentes, setDirigentes] = useState<DirigenteDTO[]>([]);
  const [buscar, setBuscar] = useState("");
  const [tipo, setTipo] = useState("");
  const [colonia, setColonia] = useState("");
  const [incluirBajas, setIncluirBajas] = useState(false);
  const [mostrar, setMostrar] = useState(TAMANO_PAGINA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cargaId = useRef(0);
  const cacheListado = useRef(new Map<string, DirigenteDTO[]>());

  const load = useCallback(async (signal?: AbortSignal) => {
    const id = ++cargaId.current;
    const clave = claveListadoDirigentes(incluirBajas, buscar, tipo);
    const cached = cacheListado.current.get(clave);
    if (cached) {
      setDirigentes(cached);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (incluirBajas) {
        params.set("incluirBajas", "true");
      } else {
        params.set("estatus", "alta");
      }
      if (buscar.trim()) params.set("buscar", buscar.trim());
      if (tipo) params.set("tipo", tipo);
      const res = await apiFetch(`/api/dirigentes?${params.toString()}`, { signal });
      if (id !== cargaId.current || signal?.aborted) return;
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar dirigentes");
      }
      const data = (await res.json()) as DirigenteDTO[];
      cacheListado.current.set(clave, data);
      setDirigentes(data);
    } catch (err) {
      if (id !== cargaId.current || esAbortError(err) || signal?.aborted) return;
      setError(mensajeErrorRed(err, "Error al cargar dirigentes"));
      setDirigentes([]);
    } finally {
      if (id === cargaId.current) setLoading(false);
    }
  }, [buscar, incluirBajas, tipo]);

  useEffect(() => {
    setIncluirBajas(false);
  }, [pathname]);

  useEffect(() => {
    if (!isStaff) return;
    const controller = new AbortController();
    if (!buscar.trim()) {
      void load(controller.signal);
      return () => controller.abort();
    }
    const timer = window.setTimeout(() => {
      void load(controller.signal);
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load, buscar, incluirBajas, tipo, pathname, isStaff]);

  useEffect(() => {
    setMostrar(TAMANO_PAGINA);
  }, [tipo, colonia, buscar, incluirBajas, pathname]);

  const hayFiltros = Boolean(buscar.trim() || tipo || colonia || incluirBajas);

  const resumenFiltros = [
    incluirBajas ? "ESTATUS BAJA" : "ESTATUS ALTA",
    tipo ? TIPO_DIRIGENTE_LABEL[tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ?? tipo : null,
    colonia ? colonia : null,
    buscar.trim() ? `«${buscar.trim()}»` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const esBaja = esDirigenteBaja;

  const dirigentesFiltrados = useMemo(
    () =>
      dirigentes.filter(
        (d) =>
          coincideTipoFiltro(d.tipo, tipo) && coincideColoniaFiltro(d.colonia, colonia),
      ),
    [dirigentes, tipo, colonia],
  );

  const dirigentesVisibles = dirigentesFiltrados.slice(0, mostrar);

  async function toggleActivo(id: string, activo: boolean) {
    const url = activo
      ? `/api/dirigentes/${id}?reactivar=true`
      : `/api/dirigentes/${id}`;
    const res = await apiFetch(url, { method: "DELETE" });
    if (!res.ok) {
      alert("No se pudo actualizar el estado");
      return;
    }
    cacheListado.current.clear();
    await load();
  }

  if (!isStaff) {
    return null;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dirigentes</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : `${dirigentesFiltrados.length} registro(s) · ${resumenFiltros}`}
          </p>
        </div>
        <div className="page-actions">
          <Link href="/dirigentes/nuevo" className="btn-primary btn-responsive">
            + Nuevo dirigente
          </Link>
        </div>
      </div>

      <div className="card flex flex-col gap-4">
        <label className="w-full min-w-0 flex-1">
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por nombre, ID, sección o colonia…"
            className="input-search"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block sm:col-span-2 lg:col-span-3">
            <span className="label">Tipo de dirigente</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                type="button"
                className={!tipo ? "btn-primary btn-sm btn-responsive" : "btn-secondary btn-sm btn-responsive"}
                onClick={() => setTipo("")}
              >
                Todos
              </button>
              {TIPOS_DIRIGENTE.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tipo === t ? "btn-primary btn-sm btn-responsive" : "btn-secondary btn-sm btn-responsive"}
                  onClick={() => setTipo(t)}
                >
                  {t}
                </button>
              ))}
            </div>
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

          <label className="flex items-end gap-2.5 pb-2 text-sm font-medium text-ink-secondary sm:col-span-2 lg:col-span-1">
            <input
              type="checkbox"
              checked={incluirBajas}
              onChange={(e) => setIncluirBajas(e.target.checked)}
              className="checkbox-pin"
            />
            Mostrar bajas (ESTATUS BAJA)
          </label>
        </div>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {loading && dirigentes.length === 0 ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando dirigentes…
        </div>
      ) : null}

      {!loading && dirigentesFiltrados.length === 0 ? (
        <div className="card py-16 text-center">
          <p className="font-semibold text-ink">
            {hayFiltros ? "Sin resultados" : "No hay dirigentes registrados"}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {hayFiltros
              ? incluirBajas
                ? "No hay bajas con estos filtros. Desactiva «Mostrar bajas» para ver solo ESTATUS ALTA."
                : "No hay altas con estos filtros. Activa «Mostrar bajas» para ver solo ESTATUS BAJA."
              : "Comienza agregando tu primer dirigente al sistema."}
          </p>
          {!hayFiltros ? (
            <Link href="/dirigentes/nuevo" className="btn-primary mt-6 inline-flex">
              Crear dirigente
            </Link>
          ) : null}
        </div>
      ) : null}

      {dirigentesVisibles.length > 0 ? (
      <div className="card-grid">
        {dirigentesVisibles.map((d) => (
          <article
            key={d.id}
            className={cn(
              "card-hover flex flex-col gap-4",
              incluirBajas ? "card-dirigente-baja" : "card-dirigente-alta",
            )}
          >
            <div className="flex items-start gap-4">
              {d.fotoUrl ? (
                <UploadImage
                  src={d.fotoUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="avatar"
                  loading="lazy"
                />
              ) : (
                <div className="avatar-placeholder">Sin foto</div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge-muted shrink-0">#{d.id}</span>
                  {d.distritoLocal != null ? (
                    <span className="badge-pin shrink-0">Distrito {d.distritoLocal}</span>
                  ) : null}
                  {incluirBajas ? (
                    <span className="dirigente-estatus-baja shrink-0">Baja</span>
                  ) : (
                    <DirigenteEstatusAltaIcon />
                  )}
                  {d.status !== "ACTIVO" && d.status !== "BAJA" ? (
                    <span className="badge-muted shrink-0">
                      {STATUS_DIRIGENTE_LABEL[d.status] ?? d.status}
                    </span>
                  ) : null}
                </div>
                <dl className="mt-2 space-y-1 text-sm">
                  <div>
                    <dt className="sr-only">Nombre</dt>
                    <dd className="break-words font-bold text-ink">{d.nombre}</dd>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-ink-secondary">Apellido paterno</dt>
                      <dd className="break-words font-medium text-ink">{d.primerApellido}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-secondary">Apellido materno</dt>
                      <dd className="break-words font-medium text-ink">{d.segundoApellido || "—"}</dd>
                    </div>
                  </div>
                </dl>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="badge-pin shrink-0">{d.tipo}</span>
                  <span className="break-anywhere text-sm text-ink-secondary">{d.colonia}</span>
                </div>
                {d.usuario || d.password ? (
                  <p className="break-anywhere mt-2 text-xs text-ink-secondary">
                    {d.usuario ? <>Usuario {d.usuario}</> : null}
                    {d.usuario && d.password ? " · " : null}
                    {d.password ? <>Contraseña {d.password}</> : d.usuario ? " · Sin contraseña registrada" : null}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="text-sm text-ink-secondary">
              <p>
                Sección {d.seccionElectoral} · Teléfono {d.telefonoCelular}
              </p>
            </div>

            <div className="divider card-actions pt-3">
              <Link
                href={`/dirigentes/${d.id}/consultar`}
                className="btn-primary btn-sm btn-responsive"
              >
                Consultar
              </Link>
              <Link href={`/dirigentes/${d.id}`} className="btn-secondary btn-sm btn-responsive">
                Editar
              </Link>
              {d.activo && d.status !== "BAJA" ? (
                <button
                  type="button"
                  className="btn-danger btn-sm btn-responsive"
                  onClick={() => void toggleActivo(d.id, false)}
                >
                  Dar de baja
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary btn-sm btn-responsive"
                  onClick={() => void toggleActivo(d.id, true)}
                >
                  Reactivar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      ) : null}

      {!loading && dirigentesFiltrados.length > dirigentesVisibles.length ? (
        <div className="flex justify-center">
          <button
            type="button"
            className="btn-secondary btn-responsive"
            onClick={() => setMostrar((n) => n + TAMANO_PAGINA)}
          >
            Cargar más ({dirigentesFiltrados.length - dirigentesVisibles.length} restantes)
          </button>
        </div>
      ) : null}
    </div>
  );
}
