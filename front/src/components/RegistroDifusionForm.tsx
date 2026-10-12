"use client";

import { Form, Formik, type FormikErrors } from "formik";
import { useEffect, useState } from "react";
import { ServicioUrbanoMapPicker } from "@/components/ServicioUrbanoMapPicker";
import { UploadImage } from "@/components/UploadImage";
import { apiFetch } from "@/lib/api";
import type { CampanaDifusionDTO, RegistroDifusionDTO } from "@/lib/difusion";
import { reverseGeocodeMapbox } from "@/lib/mapbox-geocode";
import {
  registroDifusionEditFormSchema,
  registroDifusionFormSchema,
  resumenCamposFaltantesRegistroDifusion,
  type RegistroDifusionFormValues,
} from "@/lib/validation-difusion";

type Props = {
  campanas: CampanaDifusionDTO[];
  registro?: RegistroDifusionDTO;
  onSuccess: () => void;
  onCancel: () => void;
};

function valoresIniciales(
  campanas: CampanaDifusionDTO[],
  registro?: RegistroDifusionDTO,
): RegistroDifusionFormValues {
  return {
    campanaId: registro?.campanaId ?? campanas[0]?.id ?? "",
    fotoUrl: registro?.fotoUrl ?? "",
    lat: registro?.lat ?? null,
    lng: registro?.lng ?? null,
    direccion: "",
  };
}

export function RegistroDifusionForm({ campanas, registro, onSuccess, onCancel }: Props) {
  const editando = Boolean(registro);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoDireccion, setCargandoDireccion] = useState(false);

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
    <Formik<RegistroDifusionFormValues>
      initialValues={valoresIniciales(campanas, registro)}
      enableReinitialize
      validationSchema={editando ? registroDifusionEditFormSchema : registroDifusionFormSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setError(null);
        setSubmitting(true);
        try {
          const res = await apiFetch(
            editando ? `/api/difusion/registros/${registro!.id}` : "/api/difusion/registros",
            {
              method: editando ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                campanaId: values.campanaId,
                fotoUrl: values.fotoUrl,
                lat: values.lat,
                lng: values.lng,
              }),
            },
          );
          if (!res.ok) {
            const data = (await res.json()) as { error?: string; detalles?: string[] };
            throw new Error(data.error ?? data.detalles?.join(" ") ?? "Error al guardar");
          }
          onSuccess();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, setFieldValue, isSubmitting, errors, submitCount }) => (
        <RegistroDifusionFormBody
          campanas={campanas}
          editando={editando}
          registro={registro}
          values={values}
          setFieldValue={setFieldValue}
          errors={errors}
          submitCount={submitCount}
          uploading={uploading}
          isSubmitting={isSubmitting}
          error={error}
          cargandoDireccion={cargandoDireccion}
          setCargandoDireccion={setCargandoDireccion}
          subirFoto={subirFoto}
          onCancel={onCancel}
        />
      )}
    </Formik>
  );
}

function RegistroDifusionFormBody({
  campanas,
  editando,
  registro,
  values,
  setFieldValue,
  errors,
  submitCount,
  uploading,
  isSubmitting,
  error,
  cargandoDireccion,
  setCargandoDireccion,
  subirFoto,
  onCancel,
}: {
  campanas: CampanaDifusionDTO[];
  editando: boolean;
  registro?: RegistroDifusionDTO;
  values: RegistroDifusionFormValues;
  setFieldValue: (field: string, value: unknown) => void;
  errors: FormikErrors<RegistroDifusionFormValues>;
  submitCount: number;
  uploading: boolean;
  isSubmitting: boolean;
  error: string | null;
  cargandoDireccion: boolean;
  setCargandoDireccion: (v: boolean) => void;
  subirFoto: (file: File) => Promise<string>;
  onCancel: () => void;
}) {
  const mostrarErrores = submitCount > 0;
  const resumenFaltantes = mostrarErrores ? resumenCamposFaltantesRegistroDifusion(errors) : null;

  useEffect(() => {
    if (!editando || !registro) return;
    if (values.direccion.trim()) return;
    if (values.lat == null || values.lng == null) return;

    let cancelled = false;
    setCargandoDireccion(true);
    void reverseGeocodeMapbox(values.lng, values.lat)
      .then((direccion) => {
        if (!cancelled && direccion.trim()) {
          void setFieldValue("direccion", direccion);
        }
      })
      .finally(() => {
        if (!cancelled) setCargandoDireccion(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editando, registro, values.lat, values.lng, values.direccion, setFieldValue, setCargandoDireccion]);

  return (
    <Form className="card-section space-y-5">
      {editando ? (
        <div className="panel-soft text-sm">
          <span className="text-xs uppercase text-ink-secondary">Campaña</span>
          <p className="mt-1 font-medium text-ink">{registro?.campanaTitulo ?? "—"}</p>
          <p className="mt-1 text-xs text-ink-secondary">
            Puedes cambiar la fotografía y la ubicación mientras la campaña no esté cerrada.
          </p>
        </div>
      ) : (
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
          {mostrarErrores && errors.campanaId ? (
            <p className="field-error mt-1">{errors.campanaId}</p>
          ) : null}
        </label>
      )}

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
        {mostrarErrores && errors.fotoUrl ? (
          <p className="field-error mt-1">{errors.fotoUrl}</p>
        ) : null}
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
            direccion={values.direccion}
            onChange={({ lat, lng, direccion }) => {
              void setFieldValue("lat", lat);
              void setFieldValue("lng", lng);
              void setFieldValue("direccion", direccion);
            }}
          />
        </div>
        {cargandoDireccion ? (
          <p className="mt-1 text-xs text-ink-secondary">Obteniendo dirección del registro…</p>
        ) : null}
        {mostrarErrores && errors.direccion ? (
          <p className="field-error mt-1">{errors.direccion}</p>
        ) : null}
        {mostrarErrores && !errors.direccion && (errors.lat || errors.lng) ? (
          <p className="field-error mt-1">{errors.lat ?? errors.lng}</p>
        ) : null}
      </div>

      {resumenFaltantes ? <div className="alert-error text-sm font-medium">{resumenFaltantes}</div> : null}
      {error ? <div className="alert-error text-sm">{error}</div> : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting || uploading}>
          {isSubmitting ? "Guardando…" : editando ? "Guardar cambios" : "Registrar acción"}
        </button>
        <button type="button" className="btn-ghost btn-responsive" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </Form>
  );
}
