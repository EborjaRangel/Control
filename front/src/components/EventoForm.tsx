"use client";

import { Form, Formik, useFormikContext } from "formik";
import Link from "next/link";
import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { FormField, FormSelect } from "@/components/FormField";
import { cn } from "@/lib/cn";
import { ALCANCE_EVENTO_LABEL } from "@/lib/asistencia";
import { NOMBRES_COLONIAS_COYOACAN } from "@/lib/colonias";
import {
  TIPO_DIRIGENTE_LABEL,
  TIPOS_DIRIGENTE,
  TIPOS_DIRIGENTE_CAMPO,
  TIPOS_DIRIGENTE_ORGANIZACION,
  type TipoDirigente,
} from "@/lib/dirigentes";
import {
  DISTRITOS_LOCALES_COYOACAN,
  SECCIONES_ELECTORALES_COYOACAN,
  etiquetaSeccion,
} from "@/lib/secciones-electorales";
import { etiquetaUnidadTerritorial, type UnidadTerritorialResumen } from "@/lib/unidades-territoriales";
import {
  ALCANCES_EVENTO_GEO,
  eventoCreateSchema,
  TIPOS_OPERACION_EVENTO,
  type EventoFormValues,
} from "@/lib/validation-asistencia";

const TIPO_OPERACION_LABEL: Record<string, string> = {
  PASE_LISTA: "Pase de lista (un escaneo por dirigente)",
  MOVILIZACION: "Movilización (escaneos ilimitados; se indica cuántas personas por escaneo)",
};

type Props = {
  initialValues: EventoFormValues;
  onSubmit: (values: EventoFormValues) => Promise<void>;
  cancelHref: string;
  submitLabel?: string;
  uts?: UnidadTerritorialResumen[];
};

function AlcanceTerritorialRadios() {
  const { values, setFieldValue, submitCount, errors, touched } = useFormikContext<EventoFormValues>();
  const showError = Boolean(errors.alcance && (touched.alcance || submitCount > 0));

  return (
    <fieldset className="space-y-3">
      <legend className="label">Alcance territorial</legend>
      <p className="text-xs text-ink-secondary">
        Define dónde viven o se ubican los dirigentes elegibles para escanear en este evento.
      </p>
      <div className="flex flex-col gap-2">
        {ALCANCES_EVENTO_GEO.map((a) => (
          <label
            key={a}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-2.5",
              values.alcance === a && "border-pin bg-pin-light/30",
            )}
          >
            <input
              type="radio"
              name="alcance"
              className="mt-1"
              checked={values.alcance === a}
              onChange={() => {
                void setFieldValue("alcance", a);
                if (a !== "COLONIA") void setFieldValue("colonia", "");
                if (a !== "SECCION") void setFieldValue("seccionElectoral", "");
                if (a !== "UNIDAD_TERRITORIAL") void setFieldValue("unidadTerritorialId", "");
                if (a !== "DISTRITO") void setFieldValue("distritoLocal", "");
              }}
            />
            <span className="text-sm font-medium text-ink">{ALCANCE_EVENTO_LABEL[a]}</span>
          </label>
        ))}
      </div>
      {showError ? <p className="field-error">{errors.alcance}</p> : null}
    </fieldset>
  );
}

function TiposDirigenteCheckboxes() {
  const { values, setFieldValue, submitCount, errors, touched } = useFormikContext<EventoFormValues>();
  const showError = Boolean(errors.tiposDirigente && (touched.tiposDirigente || submitCount > 0));

  function toggle(tipo: TipoDirigente) {
    const set = new Set(values.tiposDirigente);
    if (set.has(tipo)) set.delete(tipo);
    else set.add(tipo);
    void setFieldValue("tiposDirigente", [...set]);
  }

  function seleccionarTodos() {
    void setFieldValue("tiposDirigente", [...TIPOS_DIRIGENTE]);
  }

  function quitarTodos() {
    void setFieldValue("tiposDirigente", []);
  }

  const bloques = [
    { titulo: "Dirigente de campo (D1–D4)", tipos: TIPOS_DIRIGENTE_CAMPO },
    { titulo: "Organización", tipos: TIPOS_DIRIGENTE_ORGANIZACION },
  ];

  return (
    <fieldset className="space-y-3">
      <legend className="label">Tipos de dirigente incluidos en el escaneo</legend>
      <p className="text-xs text-ink-secondary">
        Marca cada categoría que pueda pasar lista o registrar movilización en este evento.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={() => seleccionarTodos()}>
          Marcar todos
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => quitarTodos()}>
          Quitar todos
        </button>
      </div>
      {bloques.map((bloque) => (
        <div key={bloque.titulo} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">{bloque.titulo}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {bloque.tipos.map((tipo) => (
              <label
                key={tipo}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm",
                  values.tiposDirigente.includes(tipo) && "border-pin bg-pin-light/20",
                )}
              >
                <input
                  type="checkbox"
                  checked={values.tiposDirigente.includes(tipo)}
                  onChange={() => toggle(tipo)}
                />
                <span className="text-ink">{TIPO_DIRIGENTE_LABEL[tipo]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      {showError ? (
        <p className="field-error">
          {typeof errors.tiposDirigente === "string" ? errors.tiposDirigente : "Selecciona al menos un tipo"}
        </p>
      ) : null}
    </fieldset>
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

  if (values.alcance === "TODOS") {
    return (
      <p className="panel-soft text-sm text-ink-secondary">
        Sin filtro por colonia, sección, UT ni distrito; solo aplican los tipos de dirigente marcados abajo.
      </p>
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

          <FormSelect label="Tipo de evento" name="tipoOperacion">
            {TIPOS_OPERACION_EVENTO.map((t) => (
              <option key={t} value={t}>
                {TIPO_OPERACION_LABEL[t] ?? t}
              </option>
            ))}
          </FormSelect>

          <AlcanceTerritorialRadios />
          <AlcanceCampos uts={uts} />
          <TiposDirigenteCheckboxes />

          <p className="text-sm text-ink-secondary">
            Después de crear el evento podrás redactar y enviar la convocatoria por correo, SMS y WhatsApp desde la
            ficha del evento.
          </p>

          <div className="page-actions">
            <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting}>
              <AppIcon name="check" className="size-4 shrink-0" />
              {isSubmitting ? "Guardando…" : submitLabel}
            </button>
            <Link href={cancelHref} className="btn-ghost btn-responsive">
              <AppIcon name="x" className="size-4 shrink-0" />
              Cancelar
            </Link>
          </div>
        </Form>
      )}
    </Formik>
  );
}
