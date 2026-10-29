"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { DifusionAdminMapaSection } from "@/components/DifusionAdminMapaSection";
import { TableWrap } from "@/components/TableWrap";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { formatRegistroDifusionFecha, type CampanaDifusionDTO, type RegistroDifusionDTO } from "@/lib/difusion";

export default function DifusionAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();
  const [campanas, setCampanas] = useState<CampanaDifusionDTO[]>([]);
  const [registros, setRegistros] = useState<RegistroDifusionDTO[]>([]);
  const campanaInicial = searchParams.get("campanaId") ?? "";
  const dirigenteInicial = searchParams.get("dirigenteId") ?? "";
  const [campanaFiltro, setCampanaFiltro] = useState(campanaInicial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resCampanas, resMapa] = await Promise.all([
        apiFetch("/api/difusion/campanas"),
        apiFetch(`/api/difusion/registros/mapa${campanaFiltro ? `?campanaId=${encodeURIComponent(campanaFiltro)}` : ""}`),
      ]);
      if (!resCampanas.ok || !resMapa.ok) throw new Error("Error al cargar difusión");
      setCampanas((await resCampanas.json()) as CampanaDifusionDTO[]);
      setRegistros((await resMapa.json()) as RegistroDifusionDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [campanaFiltro]);

  useEffect(() => {
    setCampanaFiltro(searchParams.get("campanaId") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    void load();
  }, [isAdmin, router, load]);

  const activas = useMemo(() => campanas.filter((c) => c.estado === "ACTIVA").length, [campanas]);

  if (!isAdmin) return null;

  if (loading) {
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
            Campañas de difusión · {activas} activa(s) · {registros.length} acción(es) en mapa
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
        initialDirigenteId={dirigenteInicial}
        campanaFiltroExtra={
          <label className="flex min-w-0 flex-col gap-1">
            <span className="label">Filtrar campaña</span>
            <select
              className="input"
              value={campanaFiltro}
              onChange={(e) => setCampanaFiltro(e.target.value)}
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
