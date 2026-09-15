"use client";

import { Form, Formik } from "formik";
import Link from "next/link";
import { useState } from "react";
import { AsambleaSeccionMapPicker } from "@/components/AsambleaSeccionMapPicker";
import { FormField, FormSelect, FormTextarea } from "@/components/FormField";
import { ImageUploadStandalone } from "@/components/ImageUploadStandalone";
import {
  asambleaAdminSchema,
  MAX_FOTOS_ASAMBLEA,
  type AsambleaAdminFormValues,
} from "@/lib/validation-asambleas";

type DirigenteOption = {
  id: string;
  nombreCompleto: string;
  seccionElectoral: string;
  colonia: string;
};

type Props = {
  initialValues: AsambleaAdminFormValues;
  dirigentes: DirigenteOption[];
  dirigenteId?: string;
  onSubmit: (values: AsambleaAdminFormValues & { dirigenteId: string }) => Promise<void>;
  cancelHref: string;
  onCancel?: () => void;
  submitLabel?: string;
  lockDirigente?: boolean;
};

export function AsambleaAdminForm({
  initialValues,
  dirigentes,
  dirigenteId: dirigenteIdProp,
  onSubmit,
  cancelHref,
  onCancel,
  submitLabel = "Guardar asamblea",
  lockDirigente = false,
}: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [dirigenteId, setDirigenteId] = useState(dirigenteIdProp ?? dirigentes[0]?.id ?? "");

  const dirigente = dirigentes.find((d) => d.id === dirigenteId) ?? dirigentes[0];
  const seccionElectoral = dirigente?.seccionElectoral ?? initialValues.seccionElectoral;

  return (
    <Formik
      initialValues={{ ...initialValues, seccionElectoral }}
      validationSchema={asambleaAdminSchema}
      enableReinitialize
      onSubmit={async (values, { setSubmitting }) => {
        setApiError(null);
        if (!dirigenteId) {
          setApiError("Selecciona un dirigente");
          setSubmitting(false);
          return;
        }
        try {
          await onSubmit({
            ...values,
            seccionElectoral,
            dirigenteId,
            observacion: values.observacion?.trim() ? values.observacion.trim() : null,
          });
        } catch (err) {
          setApiError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, setFieldValue, isSubmitting, errors, submitCount }) => {
        const fotos = values.fotos ?? [];
        const puedeAgregarFoto = fotos.length < MAX_FOTOS_ASAMBLEA;

        return (
          <Form className="space-y-6">
            <section className="card-section space-y-4">
              <h2 className="section-title">Información general</h2>
              {!lockDirigente ? (
                <label className="label">
                  Dirigente
                  <select
                    className="input"
                    value={dirigenteId}
                    onChange={(e) => setDirigenteId(e.target.value)}
                  >
                    <option value="">Selecciona dirigente</option>
                    {dirigentes.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombreCompleto} · Sección {d.seccionElectoral}
                      </option>
                    ))}
                  </select>
                </label>
              ) : dirigente ? (
                <p className="text-sm text-ink-secondary">
                  Dirigente: <strong className="text-ink">{dirigente.nombreCompleto}</strong>
                </p>
              ) : null}
              <FormField label="Título de la asamblea" name="titulo" />
              <FormTextarea label="Descripción" name="descripcion" rows={4} />
              <div className="grid gap-4 form-grid sm:grid-cols-2">
                <FormField label="Fecha" name="fecha" type="date" />
                <FormField label="Hora (24 h)" name="hora" type="time" />
                <FormField
                  label="Personas requeridas"
                  name="cantidadConvocada"
                  type="number"
                  inputMode="numeric"
                  min={0}
                />
                <FormField
                  label="Personas que asistieron"
                  name="cantidadReal"
                  type="number"
                  inputMode="numeric"
                  min={0}
                />
                <FormSelect label="Calificación (1 a 5)" name="calificacion">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} — {n === 1 ? "Muy baja" : n === 5 ? "Excelente" : ""}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <FormTextarea label="Observación del administrador" name="observacion" rows={3} />
            </section>

            <section className="card-section space-y-4">
              <AsambleaSeccionMapPicker
                seccionElectoral={seccionElectoral}
                colonia={dirigente?.colonia}
                lat={values.lat || null}
                lng={values.lng || null}
                lugar={values.lugar}
                onChange={({ lat, lng, lugar }) => {
                  void setFieldValue("lat", lat);
                  void setFieldValue("lng", lng);
                  void setFieldValue("lugar", lugar);
                }}
              />
              {(errors.lat || errors.lng) && submitCount > 0 ? (
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
              <div className="grid gap-6 sm:grid-cols-2">
                {fotos.map((url, index) => (
                  <ImageUploadStandalone
                    key={`${index}-${url}`}
                    label={`Foto ${index + 1}`}
                    value={url}
                    previewAlt={`Foto ${index + 1}`}
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
