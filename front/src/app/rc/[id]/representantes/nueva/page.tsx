"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { RepresentanteCasillaForm } from "@/components/RepresentanteCasillaForm";
import { apiFetch } from "@/lib/api";
import { canManageRc } from "@/lib/mi-panel";
import { nombreColoniaCatalogo } from "@/lib/colonias";
import { EMPTY_REPRESENTANTE, type RcDTO } from "@/lib/rc-rg";
import type { RepresentanteCasillaFormValues } from "@/lib/validation-rc-rg";

export default function NuevaRepresentanteRcPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [rc, setRc] = useState<RcDTO | null>(null);
  const canAccess = canManageRc(user, id);

  useEffect(() => {
    if (!canAccess) return;
    void apiFetch(`/api/rc/${id}`)
      .then(async (res) => (res.ok ? ((await res.json()) as RcDTO) : null))
      .then(setRc);
  }, [id, canAccess]);

  async function handleSubmit(values: RepresentanteCasillaFormValues) {
    const coloniaRc = nombreColoniaCatalogo(rc!.colonia);
    const res = await apiFetch(`/api/rc/${id}/representantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        colonia: coloniaRc,
        coloniaSeccion: coloniaRc,
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
    router.push(`/rc/${id}`);
  }

  if (!canAccess) return null;
  if (!rc) return <p className="text-ink-secondary">Cargando…</p>;

  const coloniaAsignada = nombreColoniaCatalogo(rc.colonia);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Registrar representante de casilla</h1>
        <p className="page-subtitle">
          Responsable de casilla: {rc.nombreCompleto} · Colonia {coloniaAsignada}
        </p>
      </div>
      <RepresentanteCasillaForm
        initialValues={{
          ...EMPTY_REPRESENTANTE,
          colonia: coloniaAsignada,
          coloniaSeccion: coloniaAsignada,
        }}
        coloniaAsignada={rc.colonia}
        onSubmit={handleSubmit}
        cancelHref={`/rc/${id}`}
      />
    </div>
  );
}
