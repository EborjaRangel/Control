"use client";

import { useEffect, useState } from "react";
import { BuscarDirigentesMaterial } from "@/components/BuscarDirigentesMaterial";
import { UploadImage } from "@/components/UploadImage";
import { apiFetch } from "@/lib/api";
import type { LineaMaterialDTO } from "@/lib/material";

type LineaDraft = LineaMaterialDTO & { key: string };

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
  const [lineas, setLineas] = useState<LineaDraft[]>([nuevaLinea()]);
  const [totalConvocados, setTotalConvocados] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch("/api/dirigentes?estatus=alta&orden=apellidos")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as unknown[];
        setTotalConvocados(data.length);
      })
      .catch(() => setTotalConvocados(null));
  }, []);

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

  function actualizarLinea(lineKey: string, patch: Partial<LineaDraft>) {
    setLineas((prev) => prev.map((l) => (l.key === lineKey ? { ...l, ...patch } : l)));
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

    const lineasComunes = lineas.map(({ descripcion, fotoUrl, cantidad }) => ({
      descripcion: descripcion.trim(),
      fotoUrl,
      cantidad,
    }));

    for (const l of lineasComunes) {
      if (!l.descripcion || !l.fotoUrl || l.cantidad < 1) {
        setError("Completa descripción, foto y cantidad de cada material");
        return;
      }
    }

    setGuardando(true);
    try {
      const res = await apiFetch("/api/material/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          fechaInicio,
          fechaFin,
          todosDirigentesActivos: true,
          lineasComunes,
        }),
      });
      const body = (await res.json()) as { id?: string; error?: string; detalles?: string[] };
      if (!res.ok) {
        const detalle = body.detalles?.filter(Boolean).join(" · ");
        throw new Error(detalle || body.error || "Error al guardar");
      }
      onSuccess(body.id!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

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
        <h2 className="section-title">Convocados</h2>
        <div className="panel-soft text-sm">
          <strong className="text-ink">
            {totalConvocados != null ? totalConvocados : "…"} dirigentes activos
          </strong>{" "}
          quedan incluidos en esta entrega. Al escanear el QR se registrará quién ya recogió; la lista de pase
          mostrará pendientes y entregados.
        </div>
        <p className="text-sm text-ink-secondary">
          Usa los filtros para consultar dirigentes (todos permanecen convocados).
        </p>
        <BuscarDirigentesMaterial convocadosTodos />
      </section>

      <section className="card-section space-y-4">
        <h2 className="section-title">Material (mismo paquete para todos)</h2>
        <p className="text-sm text-ink-secondary">
          Define uno o más materiales; se asignará a cada dirigente convocado.
        </p>
        {lineas.map((linea) => (
          <div key={linea.key} className="panel-soft space-y-3 p-4">
            <label className="block">
              <span className="label">Descripción del material</span>
              <input
                className="input mt-1"
                value={linea.descripcion}
                onChange={(e) => actualizarLinea(linea.key, { descripcion: e.target.value })}
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
                  actualizarLinea(linea.key, {
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
                      void subirFoto(file, linea.key).then((url) => actualizarLinea(linea.key, { fotoUrl: url }));
                    }}
                  />
                </label>
              </div>
            </div>
            {lineas.length > 1 ? (
              <button
                type="button"
                className="btn-ghost btn-responsive text-sm"
                onClick={() => setLineas((prev) => prev.filter((l) => l.key !== linea.key))}
              >
                Quitar material
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" className="btn-secondary btn-responsive" onClick={() => setLineas((p) => [...p, nuevaLinea()])}>
          Agregar otro material
        </button>
      </section>

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
