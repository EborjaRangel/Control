"use client";

import { UploadImage } from "@/components/UploadImage";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { RepresentanteCasillaForm } from "@/components/RepresentanteCasillaForm";
import { apiFetch } from "@/lib/api";
import { canManageRg } from "@/lib/mi-panel";
import { nombreColoniaCatalogo } from "@/lib/colonias";
import {
  representanteToFormValues,
  type RepresentanteCasillaDTO,
  type RgDTO,
} from "@/lib/rc-rg";
import type { RepresentanteCasillaFormValues } from "@/lib/validation-rc-rg";

export default function RepresentanteRgDetallePage() {
  const { id, repId } = useParams<{ id: string; repId: string }>();
  const { isStaff, user } = useAuth();
  const [rg, setRg] = useState<RgDTO | null>(null);
  const [rep, setRep] = useState<RepresentanteCasillaDTO | null>(null);
  const canAccess = isStaff || user?.rgId === id;
  const canEdit = canManageRg(user, id);

  useEffect(() => {
    if (!canAccess) return;
    void Promise.all([
      apiFetch(`/api/rg/${id}`).then(async (r) => (r.ok ? ((await r.json()) as RgDTO) : null)),
      apiFetch(`/api/rg/${id}/representantes/${repId}`).then(async (r) =>
        r.ok ? ((await r.json()) as RepresentanteCasillaDTO) : null,
      ),
    ]).then(([rgData, repData]) => {
      setRg(rgData);
      setRep(repData);
    });
  }, [id, repId, canAccess]);

  async function handleSubmit(values: RepresentanteCasillaFormValues) {
    const res = await apiFetch(`/api/rg/${id}/representantes/${repId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        colonia: nombreColoniaCatalogo(values.colonia),
        coloniaSeccion: values.coloniaSeccion
          ? nombreColoniaCatalogo(values.coloniaSeccion)
          : null,
        segundoApellido: values.segundoApellido || null,
        sexo: values.sexo || null,
        claveElector: values.claveElector || null,
        curp: values.curp || null,
        numeroInterior: values.numeroInterior || null,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      throw new Error(data.detalles?.join(", ") ?? data.error ?? "Error");
    }
    setRep((await res.json()) as RepresentanteCasillaDTO);
  }

  if (!canAccess) return null;
  if (!rg || !rep) return <p className="text-ink-secondary">Cargando…</p>;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">{rep.nombreCompleto}</h1>
        <Link href={`/rg/${id}`} className="btn-ghost btn-responsive">Volver</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="label mb-2">INE anverso</p>
          <UploadImage src={rep.ineFrenteUrl} alt="Anverso" width={400} height={250} className="max-w-sm rounded-pin object-contain ring-1 ring-line" />
        </div>
        <div className="card">
          <p className="label mb-2">INE reverso</p>
          <UploadImage src={rep.ineReversoUrl} alt="Reverso" width={400} height={250} className="max-w-sm rounded-pin object-contain ring-1 ring-line" />
        </div>
      </div>
      {canEdit ? (
        <RepresentanteCasillaForm
          initialValues={representanteToFormValues(rep)}
          distritoLocal={rg.dirigente?.distritoLocal ?? null}
          onSubmit={handleSubmit}
          cancelHref={`/rg/${id}`}
          submitLabel="Guardar cambios"
        />
      ) : null}
    </div>
  );
}
