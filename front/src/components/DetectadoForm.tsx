"use client";

import { Form, Formik } from "formik";
import Link from "next/link";
import { useState } from "react";
import { FormField, FormSelect } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { seccionesParaSelect, etiquetaSeccion } from "@/lib/secciones-electorales";
import {
  detectadoCreateSchema,
  detectadoUpdateSchema,
  type DetectadoFormValues,
} from "@/lib/validation-detectado";

type Props = {
  initialValues: DetectadoFormValues;
  onSubmit: (values: DetectadoFormValues) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
  modo?: "crear" | "editar";
  /** Si se indica, la sección electoral queda fija (asignada al dirigente). */
  seccionFija?: string;
};

export function DetectadoForm({
  initialValues,
  onSubmit,
  cancelHref,
  submitLabel = "Guardar",
  modo = "crear",
  seccionFija,
}: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const schema = modo === "crear" ? detectadoCreateSchema : detectadoUpdateSchema;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={schema}
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
      {({ isSubmitting, values }) => (
        <Form className="card-section space-y-6">
          <section className="space-y-4">
            <h2 className="section-title">Datos del detectado</h2>
            <div className="grid gap-4 form-grid">
              <FormField label="Nombre(s)" name="nombre" />
              <FormField label="Primer apellido" name="primerApellido" />
              <FormField label="Segundo apellido" name="segundoApellido" />
              <FormField label="Celular" name="telefonoCelular" inputMode="numeric" />
              {seccionFija ? (
                <label className="label">
                  Sección electoral asignada
                  <input
                    type="text"
                    readOnly
                    value={etiquetaSeccion(seccionFija)}
                    className="input bg-surface-muted"
                  />
                </label>
              ) : (
                <FormSelect label="Sección electoral asignada" name="seccionElectoral">
                  <option value="">Selecciona sección</option>
                  {seccionesParaSelect(values.seccionElectoral).map((s) => (
                    <option key={s} value={s}>
                      {etiquetaSeccion(s)}
                    </option>
                  ))}
                </FormSelect>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="section-title">Identificación</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <ImageUploadField name="ineFrenteUrl" label="Anverso (frente)" previewAlt="Credencial anverso" />
              <ImageUploadField name="ineReversoUrl" label="Reverso" previewAlt="Credencial reverso" />
            </div>
          </section>

          {apiError ? <div className="alert-error">{apiError}</div> : null}

          <div className="divider flex flex-wrap justify-end gap-3 pt-2">
            <Link href={cancelHref} className="btn-ghost btn-responsive">
              Cancelar
            </Link>
            <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : submitLabel}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
