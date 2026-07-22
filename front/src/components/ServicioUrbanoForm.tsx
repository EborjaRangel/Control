"use client";

import { Form, Formik } from "formik";
import Link from "next/link";
import { useState } from "react";
import { FormField, FormSelect, FormTextarea } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { TIPOS_SERVICIO_URBANO } from "@/lib/servicios-urbanos";
import {
  servicioUrbanoFormSchema,
  type ServicioUrbanoFormValues,
} from "@/lib/validation-servicios-urbanos";

type Props = {
  initialValues: ServicioUrbanoFormValues;
  onSubmit: (values: ServicioUrbanoFormValues) => Promise<void>;
  cancelHref: string;
  onCancel?: () => void;
  submitLabel?: string;
};

export function ServicioUrbanoForm({
  initialValues,
  onSubmit,
  cancelHref,
  onCancel,
  submitLabel = "Guardar reporte",
}: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={servicioUrbanoFormSchema}
      enableReinitialize
      onSubmit={async (values, { setSubmitting }) => {
        setApiError(null);
        try {
          await onSubmit(values);
        } catch (err) {
          setApiError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, values, setFieldValue, errors, touched, submitCount }) => {
        const latError = errors.lat as string | undefined;
        const lngError = errors.lng as string | undefined;
        const showGeoError =
          Boolean((latError || lngError) && (touched.lat || touched.lng || submitCount > 0));

        function capturarUbicacion() {
          if (!navigator.geolocation) {
            setGeoError("Tu navegador no soporta geolocalización");
            return;
          }
          setGeoLoading(true);
          setGeoError(null);
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              void setFieldValue("lat", pos.coords.latitude);
              void setFieldValue("lng", pos.coords.longitude);
              setGeoLoading(false);
            },
            (err) => {
              setGeoError(
                err.code === 1
                  ? "Permite el acceso a la ubicación para registrar el reporte"
                  : "No se pudo obtener la ubicación GPS",
              );
              setGeoLoading(false);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
          );
        }

        return (
          <Form className="card-section space-y-6">
            <section className="space-y-4">
              <h2 className="section-title">Tipo de servicio</h2>
              <FormSelect label="Servicio urbano" name="tipo">
                <option value="">Selecciona un servicio</option>
                {TIPOS_SERVICIO_URBANO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </FormSelect>
              <FormTextarea
                label="Descripción u observaciones (opcional)"
                name="descripcion"
                rows={3}
                placeholder="Detalle adicional del reporte…"
              />
            </section>

            <section className="space-y-4">
              <h2 className="section-title">Ubicación georreferenciada</h2>
              <p className="text-sm text-ink-secondary">
                Usa el GPS del dispositivo para registrar dónde se reporta el servicio urbano.
              </p>
              <button
                type="button"
                className="btn-secondary btn-responsive"
                onClick={capturarUbicacion}
                disabled={geoLoading}
              >
                {geoLoading ? "Obteniendo ubicación…" : "Obtener ubicación GPS"}
              </button>
              {geoError ? <p className="field-error">{geoError}</p> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Latitud" name="lat" readOnly className="bg-surface-muted" />
                <FormField label="Longitud" name="lng" readOnly className="bg-surface-muted" />
              </div>
              {showGeoError ? (
                <p className="field-error">{latError ?? lngError ?? "Captura la ubicación GPS"}</p>
              ) : null}
              {values.lat != null && values.lng != null ? (
                <a
                  href={`https://www.google.com/maps?q=${values.lat},${values.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-pin hover:underline"
                >
                  Ver en Google Maps
                </a>
              ) : null}
            </section>

            <section className="space-y-4">
              <h2 className="section-title">Evidencia fotográfica</h2>
              <p className="text-sm text-ink-secondary">
                Sube dos fotografías: una del estado anterior y otra del estado posterior del
                servicio reportado.
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                <ImageUploadField
                  name="fotoAntesUrl"
                  label="Foto del antes"
                  previewAlt="Antes del servicio"
                />
                <ImageUploadField
                  name="fotoDespuesUrl"
                  label="Foto del después"
                  previewAlt="Después del servicio"
                />
              </div>
            </section>

            {apiError ? <div className="alert-error">{apiError}</div> : null}

            <div className="divider flex flex-wrap justify-end gap-3 pt-2">
              {onCancel ? (
                <button type="button" className="btn-ghost btn-responsive" onClick={onCancel}>
                  Cancelar
                </button>
              ) : (
                <Link href={cancelHref} className="btn-ghost btn-responsive">
                  Cancelar
                </Link>
              )}
              <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting}>
                {isSubmitting ? "Guardando…" : submitLabel}
              </button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
