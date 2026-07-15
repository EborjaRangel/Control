"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { RepresentanteCasillaForm } from "@/components/RepresentanteCasillaForm";
import { apiFetch } from "@/lib/api";
import { canManageRg } from "@/lib/mi-panel";
import { nombreColoniaCatalogo } from "@/lib/colonias";
import { EMPTY_REPRESENTANTE, type RgDTO } from "@/lib/rc-rg";
import type { RepresentanteCasillaFormValues } from "@/lib/validation-rc-rg";

export default function NuevaRepresentanteRgPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [rg, setRg] = useState<RgDTO | null>(null);
  const canAccess = canManageRg(user, id);

  useEffect(() => {
    if (!canAccess) return;
    void apiFetch(`/api/rg/${id}`)
      .then(async (res) => (res.ok ? ((await res.json()) as RgDTO) : null))
      .then(setRg);
  }, [id, canAccess]);

  async function handleSubmit(values: RepresentanteCasillaFormValues) {
    const res = await apiFetch(`/api/rg/${id}/representantes`, {
      method: "POST",
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
    router.push(`/rg/${id}`);
  }

  if (!canAccess) return null;
  if (!rg) return <p className="text-ink-secondary">Cargando…</p>;

  const distritoLocal = rg.dirigente?.distritoLocal ?? null;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Registrar representante de casilla</h1>
        <p className="page-subtitle">
          Res. General: {rg.nombreCompleto}
          {distritoLocal ? ` · Distrito local ${distritoLocal}` : ""}
        </p>
      </div>
      <RepresentanteCasillaForm
        initialValues={{
          ...EMPTY_REPRESENTANTE,
          coloniaSeccion: rg.dirigente
            ? nombreColoniaCatalogo(rg.dirigente.colonia)
            : "",
        }}
        distritoLocal={distritoLocal}
        onSubmit={handleSubmit}
        cancelHref={`/rg/${id}`}
      />
    </div>
  );
}
