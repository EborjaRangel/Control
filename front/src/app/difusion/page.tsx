"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { DifusionAdminMapaSection } from "@/components/DifusionAdminMapaSection";
import { TableWrap } from "@/components/TableWrap";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { urlDifusionAdmin } from "@/lib/difusion-admin-url";
import type { CampanaDifusionDTO, RegistroDifusionDTO } from "@/lib/difusion";

export default function DifusionAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();

  const campanaFiltro = searchParams.get("campanaId") ?? "";
  const dirigenteFiltro = searchParams.get("dirigenteId") ?? "";
  const dirigenteNombreHint = searchParams.get("dirigenteNombre") ?? "";

  const [campanas, setCampanas] = useState<CampanaDifusionDTO[]>([]);
  const [registros, setRegistros] = useState<RegistroDifusionDTO[]>([]);
  const [loadingCampanas, setLoadingCampanas] = useState(true);
  const [loadingMapa, setLoadingMapa] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoadingCampanas(true);
    void apiFetch("/api/difusion/campanas")
      .then(async (res) => {
        if (!res.ok) throw new Error("Error al cargar campañas");
        if (!cancelled) setCampanas((await res.json()) as CampanaDifusionDTO[]);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoadingCampanas(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const loadMapa = useCallback(async () => {
    setLoadingMapa(true);
    setError(null);
    try {
      const mapaParams = new URLSearchParams();
      if (campanaFiltro) mapaParams.set("campanaId", campanaFiltro);
      if (dirigenteFiltro) mapaParams.set("dirigenteId", dirigenteFiltro);
      const mapaQs = mapaParams.toString();
      const resMapa = await apiFetch(`/api/difusion/registros/mapa${mapaQs ? `?${mapaQs}` : ""}`);
      if (!resMapa.ok) throw new Error("Error al cargar mapa");
      setRegistros((await resMapa.json()) as RegistroDifusionDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setRegistros([]);
    } finally {
      setLoadingMapa(false);
    }
  }, [campanaFiltro, dirigenteFiltro]);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    void loadMapa();
  }, [isAdmin, router, loadMapa]);

  const activas = useMemo(() => campanas.filter((c) => c.estado === "ACTIVA").length, [campanas]);

  function actualizarFiltros(next: {
    campanaId?: string;
    dirigenteId?: string;
    dirigenteNombre?: string;
  }) {
    router.replace(
      urlDifusionAdmin({
        campanaId: next.campanaId ?? "",
        dirigenteId: next.dirigenteId ?? "",
        dirigenteNombre: next.dirigenteId ? next.dirigenteNombre : undefined,
      }),
      { scroll: false },
    );
  }

  if (!isAdmin) return null;

  const loadingInicial = loadingCampanas && campanas.length === 0;

  if (loadingInicial) {
    return (
      <div className="flex items-center gap-3 text-ink-secondary">
        <span className="size-5 animate-pulse rounded-full bg-pin-light" />
        Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <AppIcon name="megaphone" className="size-[1.15em] shrink-0 text-pin" />
            Difusión
          </h1>
          <p className="page-subtitle">
            Campañas de difusión · {activas} activa(s) ·{" "}
            {loadingMapa ? "…" : `${registros.length} acción(es) en mapa`}
            {dirigenteFiltro ? " (dirigente filtrado)" : ""}
          </p>
        </div>
        <Link href="/difusion/nuevo" className="btn-primary btn-responsive">
          <AppIcon name="plus" className="size-4 shrink-0" />
          Nueva campaña
        </Link>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      <DifusionAdminMapaSection
        registros={registros}
        campanaIdFiltro={campanaFiltro || undefined}
        dirigenteId={dirigenteFiltro}
        dirigenteNombreHint={dirigenteNombreHint}
        mapaCargando={loadingMapa}
        onDirigenteIdChange={(id, nombre) => {
          actualizarFiltros({
            campanaId: campanaFiltro,
            dirigenteId: id,
            dirigenteNombre: nombre,
          });
        }}
        campanaFiltroExtra={
          <label className="flex min-w-0 flex-col gap-1">
            <span className="label">Filtrar campaña</span>
            <select
              className="input"
              value={campanaFiltro}
              onChange={(e) => {
                actualizarFiltros({
                  campanaId: e.target.value,
                  dirigenteId: dirigenteFiltro,
                  dirigenteNombre: dirigenteNombreHint,
                });
              }}
            >
              <option value="">Todas</option>
              {campanas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <section className="card-section space-y-4">
        <h2 className="section-title">Campañas</h2>
        <TableWrap>
          <table className="table-dense">
            <thead>
              <tr>
                <th>Título</th>
                <th>Vigencia</th>
                <th>Estado</th>
                <th>Registros</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {campanas.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.titulo}</td>
                  <td>
                    {c.fechaInicio} — {c.fechaFin}
                  </td>
                  <td>{c.estadoLabel}</td>
                  <td>{c.totalRegistros ?? "—"}</td>
                  <td className="text-right">
                    <Link href={`/difusion/${c.id}`} className="text-sm font-semibold text-pin hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </section>
    </div>
  );
}
