"use client";

import { Form, Formik } from "formik";
import Link from "next/link";
import { useState } from "react";
import { FormField, FormSelect } from "@/components/FormField";
import { NOMBRES_COLONIAS_COYOACAN } from "@/lib/colonias";
import {
  rcCreateSchema,
  rcUpdateSchema,
  rgCreateSchema,
  rgUpdateSchema,
  type RcFormValues,
  type RgFormValues,
} from "@/lib/validation-rc-rg";

type RcProps = {
  tipo: "rc";
  initialValues: RcFormValues;
  onSubmit: (values: RcFormValues) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
  modo?: "crear" | "editar";
};

type RgProps = {
  tipo: "rg";
  initialValues: RgFormValues;
  onSubmit: (values: RgFormValues) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
  modo?: "crear" | "editar";
};

export function OperadorForm(props: RcProps | RgProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const modo = props.modo ?? "crear";
  const schema =
    props.tipo === "rc"
      ? modo === "crear"
        ? rcCreateSchema
        : rcUpdateSchema
      : modo === "crear"
        ? rgCreateSchema
        : rgUpdateSchema;

  return (
    <Formik
      initialValues={props.initialValues}
      validationSchema={schema}
      enableReinitialize
      onSubmit={async (values, { setSubmitting }) => {
        setApiError(null);
        try {
          await props.onSubmit(values as RcFormValues & RgFormValues);
        } catch (err) {
          setApiError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form className="card-section space-y-6">
          <section className="space-y-4">
            <h2 className="section-title">
              {props.tipo === "rc" ? "Rep. Casilla" : "Res. General"}
            </h2>
            <div className="grid gap-4 form-grid">
              <FormField label="Nombre(s)" name="nombre" />
              <FormField label="Primer apellido" name="primerApellido" />
              <FormField label="Segundo apellido" name="segundoApellido" />
              <FormField label="Celular" name="telefonoCelular" inputMode="numeric" />
              {props.tipo === "rc" ? (
                <FormSelect label="Colonia asignada" name="colonia" className="sm:col-span-2">
                  <option value="">Selecciona colonia</option>
                  {NOMBRES_COLONIAS_COYOACAN.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </FormSelect>
              ) : null}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="section-title">Acceso al sistema</h2>
            <div className="grid gap-4 form-grid">
              <FormField label="Usuario" name="usuario" autoComplete="username" />
              <FormField
                label={modo === "crear" ? "Contraseña" : "Nueva contraseña (opcional)"}
                name="password"
                type="password"
                autoComplete={modo === "crear" ? "new-password" : "off"}
              />
            </div>
          </section>

          {apiError ? <div className="alert-error">{apiError}</div> : null}

          <div className="divider flex flex-wrap justify-end gap-3 pt-2">
            <Link href={props.cancelHref} className="btn-ghost btn-responsive">
              Cancelar
            </Link>
            <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : props.submitLabel ?? "Guardar"}
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
