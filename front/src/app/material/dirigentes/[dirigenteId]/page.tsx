"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { UploadImage } from "@/components/UploadImage";
import { useAuth } from "@/components/AuthProvider";
import { apiFetch } from "@/lib/api";
import { canViewOwnDirigente } from "@/lib/mi-panel";
import {
  formatFechaHoraMaterial,
  formatFechaMaterial,
  type RegistroEntregaMaterialDTO,
} from "@/lib/material";

export default function MaterialEntregadoDirigentePage() {
  const { dirigenteId } = useParams<{ dirigenteId: string }>();
  const { user, isStaff } = useAuth();
  const [registros, setRegistros] = useState<RegistroEntregaMaterialDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch(`/api/material/dirigentes/${dirigenteId}`);
    if (res.ok) {
      const data = (await res.json()) as { registros: RegistroEntregaMaterialDTO[] };
      setRegistros(data.registros);
    } else {
      setRegistros([]);
    }
    setLoading(false);
  }, [dirigenteId]);

  useEffect(() => {
    if (!canViewOwnDirigente(user, dirigenteId)) return;
    void load();
  }, [user, dirigenteId, load]);

  if (!canViewOwnDirigente(user, dirigenteId)) return null;

  const volverHref = isStaff
    ? "/material"
    : user?.dirigenteId === dirigenteId
      ? `/dirigentes/${dirigenteId}/consultar`
      : "/";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Material entregado</h1>
          <p className="page-subtitle">Historial de entregas confirmadas por QR</p>
        </div>
        <Link href={volverHref} className="btn-ghost btn-responsive">
          Volver
        </Link>
      </div>

      {loading ? <p className="text-ink-secondary">Cargando…</p> : null}

      {!loading && registros.length === 0 ? (
        <div className="alert-info">Aún no hay material entregado registrado.</div>
      ) : null}

      <ul className="space-y-4">
        {registros.map((r) => (
          <li key={r.id} className="card-section">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{r.eventoTitulo ?? "Entrega"}</p>
                <p className="text-sm text-ink-secondary">
                  {r.eventoFechaInicio && r.eventoFechaFin
                    ? `Vigencia ${formatFechaMaterial(r.eventoFechaInicio)} — ${formatFechaMaterial(r.eventoFechaFin)}`
                    : null}
                </p>
                <p className="mt-1 text-sm font-medium text-pin">{formatFechaHoraMaterial(r.registradoAt)}</p>
              </div>
              <span className="badge-pin">Entregado</span>
            </div>
            <ul className="mt-4 space-y-3">
              {r.lineas.map((l, i) => (
                <li key={i} className="flex gap-3 border-t border-border pt-3 first:border-0 first:pt-0">
                  <UploadImage
                    src={l.fotoUrl}
                    alt={l.descripcion}
                    width={96}
                    height={72}
                    className="size-20 shrink-0 rounded object-cover"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-ink">{l.descripcion}</p>
                    <p className="text-ink-secondary">Cantidad: {l.cantidad}</p>
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
