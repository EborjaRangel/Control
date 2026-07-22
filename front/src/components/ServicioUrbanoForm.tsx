"use client";

import { Form, Formik } from "formik";
import Link from "next/link";
import { useState } from "react";
import { FormField, FormSelect, FormTextarea } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { ServicioUrbanoMapPicker } from "@/components/ServicioUrbanoMapPicker";
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
        const direccionError = errors.direccion as string | undefined;
        const showUbicacionError =
          Boolean(
            (direccionError || errors.lat || errors.lng) &&
              (touched.lat || touched.lng || touched.direccion || submitCount > 0),
          );

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
              <h2 className="section-title">Ubicación en Mapbox</h2>
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
              {showUbicacionError ? (
                <p className="field-error">
                  {direccionError ?? "Marca la ubicación en el mapa"}
                </p>
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
