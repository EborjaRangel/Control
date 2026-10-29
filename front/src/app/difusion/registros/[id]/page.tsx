"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DifusionMapaAcciones } from "@/components/DifusionMapaAcciones";
import { RegistroDifusionForm } from "@/components/RegistroDifusionForm";
import { UploadImage } from "@/components/UploadImage";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { formatRegistroDifusionFecha, type CampanaDifusionDTO, type RegistroDifusionDTO } from "@/lib/difusion";

export default function RegistroDifusionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { isStaff, user } = useAuth();
  const [registro, setRegistro] = useState<RegistroDifusionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch(`/api/difusion/registros/${id}`);
    if (res.ok) setRegistro((await res.json()) as RegistroDifusionDTO);
    else setRegistro(null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-ink-secondary">Cargando…</p>;
  if (!registro) return <div className="alert-error">No encontrado</div>;

  const volverHref = isStaff
    ? registro.dirigenteId
      ? `/difusion/dirigentes/${registro.dirigenteId}`
      : `/difusion/${registro.campanaId}`
    : user?.dirigenteId
      ? `/difusion/dirigentes/${user.dirigenteId}`
      : "/";

  const puedeEditar =
    !isStaff &&
    user?.dirigenteId === registro.dirigenteId &&
    registro.campanaPermiteEdicion;

  const campanaStub: CampanaDifusionDTO[] = [
    {
      id: registro.campanaId,
      titulo: registro.campanaTitulo ?? "Campaña",
      fechaInicio: "",
      fechaFin: "",
      estado: registro.campanaEstado ?? "ACTIVA",
      estadoLabel: registro.campanaEstado === "CERRADA" ? "Cerrada" : "Activa",
      aceptaRegistros: false,
      cerradaAt: null,
      createdAt: "",
      updatedAt: "",
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Acción de difusión</h1>
          <p className="page-subtitle">
            {registro.campanaTitulo} · {formatRegistroDifusionFecha(registro.registradoAt)}
          </p>
        </div>
        <div className="page-actions flex-wrap">
          {puedeEditar && !editando ? (
            <button type="button" className="btn-secondary btn-responsive" onClick={() => setEditando(true)}>
              Editar
            </button>
          ) : null}
          <Link href={volverHref} className="btn-ghost btn-responsive">
            Volver
          </Link>
        </div>
      </div>

      {registro.dirigenteNombre ? (
        <p className="text-sm text-ink-secondary">
          Dirigente: <strong className="text-ink">{registro.dirigenteNombre}</strong>
          {registro.dirigenteSeccion ? ` · Sección ${registro.dirigenteSeccion}` : ""}
        </p>
      ) : null}

      {registro.campanaEstado === "CERRADA" ? (
        <p className="panel-soft text-sm text-ink-secondary">
          Campaña cerrada: este registro es solo de consulta.
        </p>
      ) : null}

      {editando && puedeEditar ? (
        <RegistroDifusionForm
          campanas={campanaStub}
          registro={registro}
          onSuccess={() => {
            setEditando(false);
            void load();
          }}
          onCancel={() => setEditando(false)}
        />
      ) : (
        <>
          <UploadImage
            src={registro.fotoUrl}
            alt="Evento de difusión"
            width={800}
            height={600}
            className="w-full max-h-[420px] rounded-lg object-contain bg-zinc-100"
          />

          <DifusionMapaAcciones
            registros={[registro]}
            selectedId={registro.id}
            mostrarNumerosGlobo={Boolean(user?.dirigenteId === registro.dirigenteId)}
            animacionAlCambiarKey={registro.id}
          />
        </>
      )}
    </div>
  );
}
