"use client";

import { useMemo, useState } from "react";
import {
  BuscarDirigentesMaterial,
  type DirigenteMaterialBusqueda,
} from "@/components/BuscarDirigentesMaterial";
import { UploadImage } from "@/components/UploadImage";
import { apiFetch } from "@/lib/api";
import { nombreCompleto } from "@/lib/dirigentes";
import type { LineaMaterialDTO } from "@/lib/material";

type LineaDraft = LineaMaterialDTO & { key: string };

type ParticipanteDraft = {
  dirigente: DirigenteMaterialBusqueda;
  lineas: LineaDraft[];
};

function nuevaLinea(): LineaDraft {
  return {
    key: crypto.randomUUID(),
    descripcion: "",
    fotoUrl: "",
    cantidad: 1,
  };
}

type Props = {
  onSuccess: (eventoId: string) => void;
  onCancel: () => void;
};

export function NuevaEntregaMaterialForm({ onSuccess, onCancel }: Props) {
  const [titulo, setTitulo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [participantes, setParticipantes] = useState<Map<string, ParticipanteDraft>>(new Map());
  const [dirigenteActivo, setDirigenteActivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(participantes.keys()), [participantes]);

  function toggleDirigente(d: DirigenteMaterialBusqueda) {
    setParticipantes((prev) => {
      const next = new Map(prev);
      if (next.has(d.id)) {
        next.delete(d.id);
        if (dirigenteActivo === d.id) setDirigenteActivo(next.keys().next().value ?? null);
      } else {
        next.set(d.id, { dirigente: d, lineas: [nuevaLinea()] });
        setDirigenteActivo(d.id);
      }
      return next;
    });
  }

  async function subirFoto(file: File, lineKey: string) {
    setUploadingKey(lineKey);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch("/api/upload", { method: "POST", body });
      if (!res.ok) throw new Error("No se pudo subir la foto");
      const data = (await res.json()) as { url: string };
      return data.url;
    } finally {
      setUploadingKey(null);
    }
  }

  function actualizarLinea(dirigenteId: string, lineKey: string, patch: Partial<LineaDraft>) {
    setParticipantes((prev) => {
      const next = new Map(prev);
      const p = next.get(dirigenteId);
      if (!p) return prev;
      next.set(dirigenteId, {
        ...p,
        lineas: p.lineas.map((l) => (l.key === lineKey ? { ...l, ...patch } : l)),
      });
      return next;
    });
  }

  async function guardar() {
    setError(null);
    if (!titulo.trim()) {
      setError("Indica el título de la entrega");
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setError("Indica las fechas de vigencia");
      return;
    }
    if (participantes.size === 0) {
      setError("Selecciona al menos un dirigente");
      return;
    }

    const payload = {
      titulo: titulo.trim(),
      fechaInicio,
      fechaFin,
      participantes: [...participantes.values()].map((p) => ({
        dirigenteId: p.dirigente.id,
        lineas: p.lineas.map(({ descripcion, fotoUrl, cantidad }) => ({
          descripcion: descripcion.trim(),
          fotoUrl,
          cantidad,
        })),
      })),
    };

    for (const p of payload.participantes) {
      if (!p.lineas.length) {
        setError(`Agrega material para ${nombreCompleto(participantes.get(p.dirigenteId)!.dirigente)}`);
        return;
      }
      for (const l of p.lineas) {
        if (!l.descripcion || !l.fotoUrl || l.cantidad < 1) {
          setError("Completa descripción, foto y cantidad de cada material");
          return;
        }
      }
    }

    setGuardando(true);
    try {
      const res = await apiFetch("/api/material/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { id?: string; error?: string; detalles?: string[] };
      if (!res.ok) throw new Error(body.error ?? body.detalles?.join(" ") ?? "Error al guardar");
      onSuccess(body.id!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  const activo = dirigenteActivo ? participantes.get(dirigenteActivo) : null;

  return (
    <div className="space-y-8">
      <section className="card-section space-y-4">
        <h2 className="section-title">Datos de la entrega</h2>
        <label className="block">
          <span className="label">Título</span>
          <input className="input mt-1" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Inicio de entrega</span>
            <input
              type="date"
              className="input mt-1"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">Término de entrega</span>
            <input
              type="date"
              className="input mt-1"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">Dirigentes</h2>
        <p className="text-sm text-ink-secondary">
          Filtra por nombre, apellidos, colonia, sección o unidad territorial y marca a quienes recibirán material.
        </p>
        <BuscarDirigentesMaterial selectedIds={selectedIds} onToggle={toggleDirigente} />
      </section>

      {participantes.size > 0 ? (
        <section className="card-section space-y-4">
          <h2 className="section-title">Material por dirigente</h2>
          <div className="flex flex-wrap gap-2">
            {[...participantes.values()].map((p) => (
              <button
                key={p.dirigente.id}
                type="button"
                className={dirigenteActivo === p.dirigente.id ? "btn-primary btn-responsive" : "btn-secondary btn-responsive"}
                onClick={() => setDirigenteActivo(p.dirigente.id)}
              >
                {nombreCompleto(p.dirigente)}
              </button>
            ))}
          </div>

          {activo ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-secondary">
                {activo.dirigente.tipo} · {activo.dirigente.colonia} · Secc. {activo.dirigente.seccionElectoral}
              </p>
              {activo.lineas.map((linea) => (
                <div key={linea.key} className="panel-soft space-y-3 p-4">
                  <label className="block">
                    <span className="label">Descripción del material</span>
                    <input
                      className="input mt-1"
                      value={linea.descripcion}
                      onChange={(e) =>
                        actualizarLinea(activo.dirigente.id, linea.key, { descripcion: e.target.value })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="label">Cantidad entregada</span>
                    <input
                      type="number"
                      min={1}
                      className="input mt-1 w-32"
                      value={linea.cantidad}
                      onChange={(e) =>
                        actualizarLinea(activo.dirigente.id, linea.key, {
                          cantidad: Number.parseInt(e.target.value, 10) || 1,
                        })
                      }
                    />
                  </label>
                  <div>
                    <span className="label">Foto del material</span>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {linea.fotoUrl ? (
                        <UploadImage
                          src={linea.fotoUrl}
                          alt="Material"
                          width={120}
                          height={90}
                          className="h-24 w-32 rounded object-cover"
                        />
                      ) : null}
                      <label className="btn-secondary btn-responsive cursor-pointer">
                        {uploadingKey === linea.key ? "Subiendo…" : linea.fotoUrl ? "Cambiar foto" : "Subir foto"}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={uploadingKey === linea.key}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            void subirFoto(file, linea.key).then((url) =>
                              actualizarLinea(activo.dirigente.id, linea.key, { fotoUrl: url }),
                            );
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {activo.lineas.length > 1 ? (
                    <button
                      type="button"
                      className="btn-ghost btn-responsive text-sm"
                      onClick={() =>
                        setParticipantes((prev) => {
                          const next = new Map(prev);
                          const p = next.get(activo.dirigente.id);
                          if (!p) return prev;
                          next.set(activo.dirigente.id, {
                            ...p,
                            lineas: p.lineas.filter((l) => l.key !== linea.key),
                          });
                          return next;
                        })
                      }
                    >
                      Quitar material
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary btn-responsive"
                onClick={() =>
                  setParticipantes((prev) => {
                    const next = new Map(prev);
                    const p = next.get(activo.dirigente.id);
                    if (!p) return prev;
                    next.set(activo.dirigente.id, { ...p, lineas: [...p.lineas, nuevaLinea()] });
                    return next;
                  })
                }
              >
                Agregar otro material
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? <div className="alert-error">{error}</div> : null}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary btn-responsive" disabled={guardando} onClick={() => void guardar()}>
          {guardando ? "Guardando…" : "Crear entrega"}
        </button>
        <button type="button" className="btn-ghost btn-responsive" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
