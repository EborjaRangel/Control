"use client";

import { Form, Formik } from "formik";
import Link from "next/link";
import { useState } from "react";
import { AsambleaSeccionMapPicker } from "@/components/AsambleaSeccionMapPicker";
import { FormField } from "@/components/FormField";
import { ImageUploadStandalone } from "@/components/ImageUploadStandalone";
import { asambleaBaseSchema, MAX_FOTOS_ASAMBLEA, type AsambleaFormValues } from "@/lib/validation-asambleas";

type Props = {
  initialValues: AsambleaFormValues;
  seccionElectoral: string;
  colonia?: string;
  onSubmit: (values: AsambleaFormValues) => Promise<void>;
  cancelHref: string;
  onCancel?: () => void;
  submitLabel?: string;
  readOnlyMap?: boolean;
};

export function AsambleaForm({
  initialValues,
  seccionElectoral,
  colonia,
  onSubmit,
  cancelHref,
  onCancel,
  submitLabel = "Guardar asamblea",
  readOnlyMap = false,
}: Props) {
  const [apiError, setApiError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={{ ...initialValues, seccionElectoral }}
      validationSchema={asambleaBaseSchema}
      enableReinitialize
      onSubmit={async (values, { setSubmitting }) => {
        setApiError(null);
        try {
          await onSubmit({ ...values, seccionElectoral });
        } catch (err) {
          setApiError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, setFieldValue, isSubmitting, errors, touched, submitCount }) => {
        const fotos = values.fotos ?? [];
        const puedeAgregarFoto = fotos.length < MAX_FOTOS_ASAMBLEA;

        return (
          <Form className="space-y-6">
            <section className="card-section space-y-4">
              <h2 className="section-title">Datos de la asamblea</h2>
              <div className="grid gap-4 form-grid sm:grid-cols-2">
                <FormField label="Fecha" name="fecha" type="date" />
                <FormField label="Hora (24 h)" name="hora" type="time" />
                <FormField
                  label="Cantidad convocada"
                  name="cantidadConvocada"
                  type="number"
                  inputMode="numeric"
                  min={0}
                />
                <FormField
                  label="Cantidad real"
                  name="cantidadReal"
                  type="number"
                  inputMode="numeric"
                  min={0}
                />
              </div>
            </section>

            <section className="card-section space-y-4">
              <AsambleaSeccionMapPicker
                seccionElectoral={seccionElectoral}
                colonia={colonia}
                lat={values.lat || null}
                lng={values.lng || null}
                lugar={values.lugar}
                readOnly={readOnlyMap}
                onChange={({ lat, lng, lugar }) => {
                  void setFieldValue("lat", lat);
                  void setFieldValue("lng", lng);
                  void setFieldValue("lugar", lugar);
                }}
              />
              {(errors.lat || errors.lng) && (touched.lat || submitCount > 0) ? (
                <p className="field-error">{errors.lat ?? errors.lng}</p>
              ) : null}
            </section>

            <section className="card-section space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="section-title">Fotografías del evento</h2>
                <span className="text-xs text-ink-secondary">
                  {fotos.length}/{MAX_FOTOS_ASAMBLEA}
                </span>
              </div>
              <p className="text-sm text-ink-secondary">
                Puedes subir hasta {MAX_FOTOS_ASAMBLEA} fotografías del evento.
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                {fotos.map((url, index) => (
                  <ImageUploadStandalone
                    key={`${index}-${url}`}
                    label={`Foto ${index + 1}`}
                    value={url}
                    previewAlt={`Foto ${index + 1} de la asamblea`}
                    onChange={(next) => {
                      const updated = [...fotos];
                      updated[index] = next;
                      void setFieldValue("fotos", updated.filter(Boolean));
                    }}
                  />
                ))}
                {puedeAgregarFoto ? (
                  <ImageUploadStandalone
                    label={`Foto ${fotos.length + 1}`}
                    value=""
                    previewAlt="Nueva foto"
                    onChange={(url) => {
                      if (!url) return;
                      void setFieldValue("fotos", [...fotos, url]);
                    }}
                  />
                ) : null}
              </div>
              {errors.fotos && submitCount > 0 ? (
                <p className="field-error">
                  {typeof errors.fotos === "string" ? errors.fotos : "Revisa las fotografías"}
                </p>
              ) : null}
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
