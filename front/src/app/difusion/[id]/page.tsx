"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CampanaDifusionAdminForm } from "@/components/CampanaDifusionAdminForm";
import { DifusionAdminMapaSection } from "@/components/DifusionAdminMapaSection";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import type { CampanaDifusionDTO, RegistroDifusionDTO } from "@/lib/difusion";

export default function CampanaDifusionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin } = useAuth();
  const [campana, setCampana] = useState<CampanaDifusionDTO | null>(null);
  const [registros, setRegistros] = useState<RegistroDifusionDTO[]>([]);
  const dirigenteFiltro = searchParams.get("dirigenteId") ?? "";
  const dirigenteNombreHint = searchParams.get("dirigenteNombre") ?? "";
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mapaParams = new URLSearchParams({ campanaId: id });
      if (dirigenteFiltro) mapaParams.set("dirigenteId", dirigenteFiltro);
      const [resC, resR] = await Promise.all([
        apiFetch(`/api/difusion/campanas/${id}`),
        apiFetch(`/api/difusion/registros/mapa?${mapaParams.toString()}`),
      ]);
      if (!resC.ok) throw new Error("No encontrado");
      setCampana((await resC.json()) as CampanaDifusionDTO);
      setRegistros(resR.ok ? ((await resR.json()) as RegistroDifusionDTO[]) : []);
    } finally {
      setLoading(false);
    }
  }, [id, dirigenteFiltro]);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    void load();
  }, [isAdmin, router, load]);

  async function cerrarCampana() {
    if (!campana || !confirm("¿Cerrar la campaña? Ya no se podrán registrar acciones.")) return;
    const res = await apiFetch(`/api/difusion/campanas/${campana.id}/cerrar`, { method: "POST" });
    if (!res.ok) {
      alert("No se pudo cerrar la campaña");
      return;
    }
    setCampana((await res.json()) as CampanaDifusionDTO);
    setEditando(false);
  }

  if (!isAdmin) return null;
  if (loading || !campana) {
    return <p className="text-ink-secondary">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{campana.titulo}</h1>
          <p className="page-subtitle">
            {campana.fechaInicio} — {campana.fechaFin} · {campana.estadoLabel} ·{" "}
            {campana.totalRegistros ?? registros.length} registro(s)
          </p>
        </div>
        <div className="page-actions flex-wrap">
          {campana.estado === "ACTIVA" ? (
            <>
              <button type="button" className="btn-secondary btn-responsive" onClick={() => setEditando((v) => !v)}>
                {editando ? "Cancelar edición" : "Editar"}
              </button>
              <button type="button" className="btn-primary btn-responsive" onClick={() => void cerrarCampana()}>
                Cerrar campaña
              </button>
            </>
          ) : null}
          <Link href="/difusion" className="btn-ghost btn-responsive">
            Volver
          </Link>
        </div>
      </div>

      {editando && campana.estado === "ACTIVA" ? (
        <CampanaDifusionAdminForm
          initial={campana}
          onSuccess={(c) => {
            setCampana(c);
            setEditando(false);
          }}
          onCancel={() => setEditando(false)}
        />
      ) : null}

      <DifusionAdminMapaSection
        registros={registros}
        campanaIdFiltro={id}
        dirigenteId={dirigenteFiltro}
        onDirigenteIdChange={(dirId, nombre) => {
          const q = new URLSearchParams();
          if (dirId) {
            q.set("dirigenteId", dirId);
            if (nombre) q.set("dirigenteNombre", nombre);
          }
          const qs = q.toString();
          router.replace(qs ? `/difusion/${id}?${qs}` : `/difusion/${id}`, { scroll: false });
        }}
        dirigenteNombreHint={dirigenteNombreHint}
        mapaCargando={loading}
        titulo="Acciones en mapa"
        subtitulo={`Registros de la campaña «${campana.titulo}».`}
      />
    </div>
  );
}
