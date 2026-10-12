"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RegistroDifusionForm } from "@/components/RegistroDifusionForm";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import type { DirigenteDifusionPanelDTO } from "@/lib/difusion";

export default function NuevoRegistroDifusionPage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const esPropio = user?.dirigenteId === dirigenteId;
  const [panel, setPanel] = useState<DirigenteDifusionPanelDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/difusion/dirigentes/${dirigenteId}`);
    if (res.ok) setPanel((await res.json()) as DirigenteDifusionPanelDTO);
    setLoading(false);
  }, [dirigenteId]);

  useEffect(() => {
    if (!canViewOwnDirigente(user, dirigenteId) || !esPropio) {
      router.replace(`/difusion/dirigentes/${dirigenteId}`);
      return;
    }
    void load();
  }, [user, dirigenteId, esPropio, router, load]);

  if (loading) return <p className="text-ink-secondary">Cargando…</p>;
  if (!panel || panel.campanasActivas.length === 0) {
    return (
      <div className="space-y-4">
        <div className="alert-info">No hay campañas activas para registrar acciones.</div>
        <Link href={`/difusion/dirigentes/${dirigenteId}`} className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrar acción de difusión</h1>
          <p className="page-subtitle">Fotografía del evento y ubicación en mapa.</p>
        </div>
      </div>
      <RegistroDifusionForm
        campanas={panel.campanasActivas}
        onSuccess={() => router.push(`/difusion/dirigentes/${dirigenteId}`)}
        onCancel={() => router.push(`/difusion/dirigentes/${dirigenteId}`)}
      />
    </div>
  );
}
