"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RegistroTransporteForm } from "@/components/RegistroTransporteForm";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import type { DirigenteTransportePanelDTO } from "@/lib/transporte";

export default function NuevoRegistroTransportePage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const esPropio = user?.dirigenteId === dirigenteId;
  const [panel, setPanel] = useState<DirigenteTransportePanelDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await apiFetch(`/api/transporte/dirigentes/${dirigenteId}`);
    if (res.ok) setPanel((await res.json()) as DirigenteTransportePanelDTO);
    setLoading(false);
  }, [dirigenteId]);

  useEffect(() => {
    if (!canViewOwnDirigente(user, dirigenteId) || !esPropio) {
      router.replace(`/transporte/dirigentes/${dirigenteId}`);
      return;
    }
    void load();
  }, [user, dirigenteId, esPropio, router, load]);

  if (loading) return <p className="text-ink-secondary">Cargando…</p>;

  if (!panel || panel.eventosAbiertos.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="alert-info">
          No hay eventos de asistencia abiertos para registrar transporte.
        </div>
        <Link href={`/transporte/dirigentes/${dirigenteId}`} className="btn-secondary btn-responsive">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Registrar transporte</h1>
          <p className="page-subtitle">
            Datos de la unidad, chofer, punto de entrega, ubicación y fotografías.
          </p>
        </div>
      </div>
      <RegistroTransporteForm
        eventos={panel.eventosAbiertos}
        onSuccess={() => router.push(`/transporte/dirigentes/${dirigenteId}`)}
        onCancel={() => router.push(`/transporte/dirigentes/${dirigenteId}`)}
      />
    </div>
  );
}
