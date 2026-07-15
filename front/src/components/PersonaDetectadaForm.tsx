"use client";

import { Form, Formik, useFormikContext } from "formik";
import Link from "next/link";
import { useState } from "react";
import { FormField, FormSelect } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import {
  CODIGOS_POSTALES_COYOACAN,
  coloniaPorDefectoDeCp,
  coloniasParaSelect,
} from "@/lib/colonias";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import {
  personaDetectadaSchema,
  type PersonaDetectadaFormValues,
} from "@/lib/validation-detectado";

type Props = {
  initialValues: PersonaDetectadaFormValues;
  seccionAsignada: string;
  onSubmit: (values: PersonaDetectadaFormValues) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
};

function CodigoPostalColoniaFields() {
  const { values, setFieldValue } = useFormikContext<PersonaDetectadaFormValues>();
  const colonias = values.codigoPostal
    ? coloniasParaSelect(values.codigoPostal, values.colonia)
    : [];
  const coloniaUnica = colonias.length === 1;

  return (
    <>
      <FormSelect
        label="Código postal"
        name="codigoPostal"
        onChange={(e) => {
          const cp = e.target.value;
          void setFieldValue("codigoPostal", cp);
          void setFieldValue("colonia", coloniaPorDefectoDeCp(cp));
        }}
      >
        <option value="">Selecciona un CP</option>
        {CODIGOS_POSTALES_COYOACAN.map((cp) => (
          <option key={cp} value={cp}>
            {cp}
          </option>
        ))}
      </FormSelect>

      <FormSelect
        label="Colonia"
        name="colonia"
        disabled={!values.codigoPostal || coloniaUnica}
      >
        <option value="">
          {!values.codigoPostal ? "Primero elige un CP" : "Selecciona una colonia"}
        </option>
        {colonias.map((c) => (
          <option key={c.nombre} value={c.nombre}>
            {c.nombre}
          </option>
        ))}
      </FormSelect>
    </>
  );
}

export function PersonaDetectadaForm({
  initialValues,
  seccionAsignada,
  onSubmit,
  cancelHref,
  submitLabel = "Registrar persona",
}: Props) {
  const [apiError, setApiError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={{ ...initialValues, seccionElectoral: seccionAsignada }}
      validationSchema={personaDetectadaSchema}
      enableReinitialize
      onSubmit={async (values, { setSubmitting }) => {
        setApiError(null);
        try {
          await onSubmit({ ...values, seccionElectoral: seccionAsignada });
        } catch (err) {
          setApiError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form className="space-y-6">
          <section className="card-section space-y-4">
            <h2 className="section-title">Datos generales (INE)</h2>
            <p className="text-sm text-ink-secondary">
              Solo personas de la sección{" "}
              <strong className="text-ink">{etiquetaSeccion(seccionAsignada)}</strong>.
            </p>
            <div className="grid gap-4 form-grid">
              <FormField label="Nombre(s)" name="nombre" />
              <FormField label="Primer apellido" name="primerApellido" />
              <FormField label="Segundo apellido" name="segundoApellido" />
              <FormField label="Fecha de nacimiento" name="fechaNacimiento" type="date" />
              <FormSelect label="Sexo" name="sexo">
                <option value="">Selecciona</option>
                <option value="H">Hombre</option>
                <option value="M">Mujer</option>
              </FormSelect>
              <FormField label="Clave de elector" name="claveElector" className="sm:col-span-2" />
              <FormField label="CURP" name="curp" className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <span className="label">Sección electoral</span>
                <p className="mt-1 text-sm font-medium text-ink">
                  {etiquetaSeccion(seccionAsignada)}
                </p>
              </div>
            </div>
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Domicilio (según INE)</h2>
            <div className="grid gap-4 form-grid">
              <CodigoPostalColoniaFields />
              <FormField label="Calle" name="calle" className="sm:col-span-2" />
              <FormField label="Número exterior" name="numeroExterior" />
              <FormField label="Número interior" name="numeroInterior" />
            </div>
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Fotografías de la credencial INE</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <ImageUploadField
                name="ineFrenteUrl"
                label="Anverso (frente)"
                previewAlt="INE anverso"
              />
              <ImageUploadField
                name="ineReversoUrl"
                label="Reverso (atrás)"
                previewAlt="INE reverso"
              />
            </div>
          </section>

          {apiError ? <div className="alert-error">{apiError}</div> : null}

          <div className="flex flex-wrap justify-end gap-3">
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
