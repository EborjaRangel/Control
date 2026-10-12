"use client";

import { Form, Formik } from "formik";
import { useState } from "react";
import { ServicioUrbanoMapPicker } from "@/components/ServicioUrbanoMapPicker";
import { UploadImage } from "@/components/UploadImage";
import { apiFetch } from "@/lib/api";
import type { CampanaDifusionDTO } from "@/lib/difusion";

type Props = {
  campanas: CampanaDifusionDTO[];
  onSuccess: () => void;
  onCancel: () => void;
};

type Values = {
  campanaId: string;
  fotoUrl: string;
  lat: number | null;
  lng: number | null;
};

export function RegistroDifusionForm({ campanas, onSuccess, onCancel }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subirFoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch("/api/upload", { method: "POST", body });
      if (!res.ok) throw new Error("No se pudo subir la foto");
      const data = (await res.json()) as { url: string };
      return data.url;
    } finally {
      setUploading(false);
    }
  }

  return (
    <Formik<Values>
      initialValues={{ campanaId: campanas[0]?.id ?? "", fotoUrl: "", lat: null, lng: null }}
      onSubmit={async (values, { setSubmitting }) => {
        setError(null);
        if (!values.campanaId) {
          setError("Selecciona la campaña");
          return;
        }
        if (!values.fotoUrl) {
          setError("Sube la fotografía del evento");
          return;
        }
        if (values.lat == null || values.lng == null) {
          setError("Marca la ubicación en el mapa");
          return;
        }
        setSubmitting(true);
        try {
          const res = await apiFetch("/api/difusion/registros", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              campanaId: values.campanaId,
              fotoUrl: values.fotoUrl,
              lat: values.lat,
              lng: values.lng,
            }),
          });
          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error ?? "Error al registrar");
          }
          onSuccess();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al registrar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, setFieldValue, isSubmitting }) => (
        <Form className="card-section space-y-5">
          <label className="block">
            <span className="label">Campaña</span>
            <select
              className="input mt-1"
              value={values.campanaId}
              onChange={(e) => void setFieldValue("campanaId", e.target.value)}
            >
              {campanas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titulo} ({c.fechaInicio} — {c.fechaFin})
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="label">Fotografía del evento</span>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {values.fotoUrl ? (
                <UploadImage
                  src={values.fotoUrl}
                  alt="Evento"
                  width={160}
                  height={120}
                  className="h-28 w-40 rounded-md object-cover"
                />
              ) : null}
              <label className="btn-secondary btn-responsive cursor-pointer">
                {uploading ? "Subiendo…" : values.fotoUrl ? "Cambiar foto" : "Subir foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void subirFoto(file).then((url) => setFieldValue("fotoUrl", url));
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <span className="label">Ubicación (mapa)</span>
            <p className="mt-1 text-sm text-ink-secondary">
              Usa tu ubicación actual o toca el mapa para marcar el punto de la acción.
            </p>
            <div className="mt-3">
              <ServicioUrbanoMapPicker
                lat={values.lat}
                lng={values.lng}
                direccion=""
                onChange={({ lat, lng }) => {
                  void setFieldValue("lat", lat);
                  void setFieldValue("lng", lng);
                }}
              />
            </div>
          </div>

          {error ? <div className="alert-error text-sm">{error}</div> : null}

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting || uploading}>
              {isSubmitting ? "Guardando…" : "Registrar acción"}
            </button>
            <button type="button" className="btn-ghost btn-responsive" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
