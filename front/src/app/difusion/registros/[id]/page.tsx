"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DifusionMapaAcciones } from "@/components/DifusionMapaAcciones";
import { UploadImage } from "@/components/UploadImage";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { formatRegistroDifusionFecha, type RegistroDifusionDTO } from "@/lib/difusion";

export default function RegistroDifusionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { isStaff, user } = useAuth();
  const [registro, setRegistro] = useState<RegistroDifusionDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch(`/api/difusion/registros/${id}`);
      if (res.ok) setRegistro((await res.json()) as RegistroDifusionDTO);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="text-ink-secondary">Cargando…</p>;
  if (!registro) return <div className="alert-error">No encontrado</div>;

  const volverHref = isStaff
    ? `/difusion/${registro.campanaId}`
    : user?.dirigenteId
      ? `/difusion/dirigentes/${user.dirigenteId}`
      : "/";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Acción de difusión</h1>
          <p className="page-subtitle">
            {registro.campanaTitulo} · {formatRegistroDifusionFecha(registro.registradoAt)}
          </p>
        </div>
        <Link href={volverHref} className="btn-ghost btn-responsive">
          Volver
        </Link>
      </div>

      {registro.dirigenteNombre ? (
        <p className="text-sm text-ink-secondary">
          Dirigente: <strong className="text-ink">{registro.dirigenteNombre}</strong>
          {registro.dirigenteSeccion ? ` · Sección ${registro.dirigenteSeccion}` : ""}
        </p>
      ) : null}

      <UploadImage
        src={registro.fotoUrl}
        alt="Evento de difusión"
        width={800}
        height={600}
        className="w-full max-h-[420px] rounded-lg object-contain bg-zinc-100"
      />

      <DifusionMapaAcciones registros={[registro]} selectedId={registro.id} />
    </div>
  );
}
