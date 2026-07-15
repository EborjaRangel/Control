"use client";

import { Form, Formik, useField, useFormikContext } from "formik";
import Link from "next/link";
import { useState } from "react";
import { FormField, FormSelect } from "@/components/FormField";
import { cn } from "@/lib/cn";
import { ALCANCE_EVENTO_LABEL } from "@/lib/asistencia";
import { NOMBRES_COLONIAS_COYOACAN } from "@/lib/colonias";
import { TIPO_DIRIGENTE_LABEL, TIPOS_DIRIGENTE } from "@/lib/dirigentes";
import {
  DISTRITOS_LOCALES_COYOACAN,
  SECCIONES_ELECTORALES_COYOACAN,
  etiquetaSeccion,
} from "@/lib/secciones-electorales";
import { etiquetaUnidadTerritorial, type UnidadTerritorialResumen } from "@/lib/unidades-territoriales";
import {
  ALCANCES_EVENTO,
  eventoCreateSchema,
  type EventoFormValues,
} from "@/lib/validation-asistencia";

type Props = {
  initialValues: EventoFormValues;
  onSubmit: (values: EventoFormValues) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
  uts?: UnidadTerritorialResumen[];
};

function AlcanceSelect() {
  const { setFieldValue, submitCount } = useFormikContext<EventoFormValues>();
  const [field, meta] = useField("alcance");
  const hasError = Boolean(meta.error && (meta.touched || submitCount > 0));

  return (
    <label className="label">
      Alcance del pase de lista
      <select
        {...field}
        id="alcance"
        className={cn("input", hasError && "input-error")}
        onChange={(e) => {
          const alcance = e.target.value;
          void setFieldValue("alcance", alcance);
          void setFieldValue("colonia", "");
          void setFieldValue("seccionElectoral", "");
          void setFieldValue("unidadTerritorialId", "");
          void setFieldValue("distritoLocal", "");
          void setFieldValue("tipoDirigente", "");
        }}
      >
        <option value="">Selecciona alcance…</option>
        {ALCANCES_EVENTO.map((a) => (
          <option key={a} value={a}>
            {ALCANCE_EVENTO_LABEL[a]}
          </option>
        ))}
      </select>
      {hasError ? <p className="field-error">{meta.error}</p> : null}
    </label>
  );
}

function AlcanceCampos({ uts }: { uts: UnidadTerritorialResumen[] }) {
  const { values } = useFormikContext<EventoFormValues>();

  if (values.alcance === "COLONIA") {
    return (
      <FormSelect label="Colonia" name="colonia">
        <option value="">Selecciona colonia…</option>
        {NOMBRES_COLONIAS_COYOACAN.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </FormSelect>
    );
  }

  if (values.alcance === "SECCION") {
    return (
      <FormSelect label="Sección electoral" name="seccionElectoral">
        <option value="">Selecciona sección…</option>
        {SECCIONES_ELECTORALES_COYOACAN.map((s) => (
          <option key={s} value={s}>
            {etiquetaSeccion(s)}
          </option>
        ))}
      </FormSelect>
    );
  }

  if (values.alcance === "UNIDAD_TERRITORIAL") {
    return (
      <FormSelect label="Unidad territorial (IECM)" name="unidadTerritorialId">
        <option value="">Selecciona UT…</option>
        {uts.map((ut) => (
          <option key={ut.id} value={ut.id}>
            {etiquetaUnidadTerritorial(ut)}
          </option>
        ))}
      </FormSelect>
    );
  }

  if (values.alcance === "DISTRITO") {
    return (
      <FormSelect label="Distrito local" name="distritoLocal">
        <option value="">Ambos distritos locales (26 y 30)</option>
        {DISTRITOS_LOCALES_COYOACAN.map((d) => (
          <option key={d} value={String(d)}>
            Distrito local {d}
          </option>
        ))}
      </FormSelect>
    );
  }

  if (values.alcance === "TIPO_DIRIGENTE") {
    return (
      <FormSelect label="Tipo de dirigente" name="tipoDirigente">
        <option value="">Selecciona tipo…</option>
        {TIPOS_DIRIGENTE.map((t) => (
          <option key={t} value={t}>
            {TIPO_DIRIGENTE_LABEL[t]}
          </option>
        ))}
      </FormSelect>
    );
  }

  return null;
}

export function EventoForm({
  initialValues,
  onSubmit,
  cancelHref,
  submitLabel = "Crear evento",
  uts = [],
}: Props) {
  const [apiError, setApiError] = useState<string | null>(null);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={eventoCreateSchema}
      onSubmit={async (values, { setSubmitting }) => {
        setApiError(null);
        try {
          await onSubmit(values);
        } catch (err) {
          setApiError(err instanceof Error ? err.message : "Error al crear evento");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form className="card-section space-y-5">
          {apiError ? <div className="alert-error">{apiError}</div> : null}

          <FormField label="Título del evento" name="titulo" />

          <div className="grid gap-4 form-grid">
            <FormField label="Fecha" name="fecha" type="date" />
            <FormField label="Hora" name="hora" type="time" />
          </div>

          <FormField label="Lugar" name="lugar" />

          <AlcanceSelect />
          <AlcanceCampos uts={uts} />

          <p className="text-sm text-ink-secondary">
            Después de crear el evento podrás redactar y enviar la convocatoria por correo, SMS y
            WhatsApp desde la ficha del evento.
          </p>

          <div className="page-actions">
            <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : submitLabel}
            </button>
            <Link href={cancelHref} className="btn-ghost btn-responsive">
              Cancelar
            </Link>
          </div>
        </Form>
      )}
    </Formik>
  );
}
