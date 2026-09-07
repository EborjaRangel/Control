"use client";

import { Form, Formik, useFormikContext } from "formik";
import Link from "next/link";
import { useState } from "react";
import { FormField, FormSelect } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { apiFetch } from "@/lib/api";
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
  /** En alta nueva: pedir CURP y validar en BD antes del resto del formulario. */
  requiereVerificacionCurp?: boolean;
  /** Al editar: excluir este registro al verificar duplicados. */
  excludePersonaId?: string;
};

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

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
  requiereVerificacionCurp = false,
  excludePersonaId,
}: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [curpVerificada, setCurpVerificada] = useState(!requiereVerificacionCurp);
  const [curpInput, setCurpInput] = useState("");
  const [curpError, setCurpError] = useState<string | null>(null);
  const [verificandoCurp, setVerificandoCurp] = useState(false);

  async function handleVerificarCurp() {
    setCurpError(null);
    const curp = curpInput.trim().toUpperCase();
    if (!curp) {
      setCurpError("La CURP es obligatoria");
      return;
    }
    if (!CURP_REGEX.test(curp)) {
      setCurpError("CURP inválida");
      return;
    }

    setVerificandoCurp(true);
    try {
      const params = new URLSearchParams({ curp });
      if (excludePersonaId) params.set("excludePersonaId", excludePersonaId);
      const res = await apiFetch(`/api/detectados/personas/verificar-curp?${params}`);
      const data = (await res.json()) as { disponible?: boolean; error?: string; curp?: string };
      if (!res.ok || !data.disponible) {
        setCurpError(data.error ?? "No se pudo verificar la CURP");
        return;
      }
      setCurpInput(data.curp ?? curp);
      setCurpVerificada(true);
    } catch {
      setCurpError("Error al verificar CURP");
    } finally {
      setVerificandoCurp(false);
    }
  }

  if (requiereVerificacionCurp && !curpVerificada) {
    return (
      <div className="space-y-6">
        <section className="card-section space-y-4">
          <h2 className="section-title">Verificar CURP</h2>
          <p className="text-sm text-ink-secondary">
            Antes de capturar los datos, ingresa la CURP de la persona. Solo se puede registrar
            una vez en todo el sistema, sin importar el dirigente.
          </p>
          <label className="label">
            CURP
            <input
              id="curp-verificacion"
              className="input mt-1 uppercase"
              value={curpInput}
              onChange={(e) => {
                setCurpInput(e.target.value.toUpperCase());
                setCurpError(null);
              }}
              maxLength={18}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {curpError ? <div className="alert-error">{curpError}</div> : null}
        </section>

        <div className="flex flex-wrap justify-end gap-3">
          <Link href={cancelHref} className="btn-ghost btn-responsive">
            Cancelar
          </Link>
          <button
            type="button"
            className="btn-primary btn-responsive"
            disabled={verificandoCurp}
            onClick={() => void handleVerificarCurp()}
          >
            {verificandoCurp ? "Verificando…" : "Continuar"}
          </button>
        </div>
      </div>
    );
  }

  const formInitialValues: PersonaDetectadaFormValues = {
    ...initialValues,
    seccionElectoral: seccionAsignada,
    curp: requiereVerificacionCurp ? curpInput : initialValues.curp,
  };

  return (
    <Formik
      initialValues={formInitialValues}
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
          {requiereVerificacionCurp ? (
            <div className="alert-success flex flex-wrap items-center justify-between gap-3">
              <span>
                CURP verificada: <strong className="text-ink">{curpInput}</strong>
              </span>
              <button
                type="button"
                className="btn-ghost text-sm"
                onClick={() => {
                  setCurpVerificada(false);
                  setCurpError(null);
                }}
              >
                Cambiar CURP
              </button>
            </div>
          ) : null}

          <section className="card-section space-y-4">
            <h2 className="section-title">Datos generales</h2>
            <p className="text-sm text-ink-secondary">
              Solo personas de la sección{" "}
              <strong className="text-ink">{etiquetaSeccion(seccionAsignada)}</strong>.
            </p>
            <div className="grid gap-4 form-grid">
              <FormField label="Nombre(s)" name="nombre" nombrePersona />
              <FormField label="Primer apellido" name="primerApellido" nombrePersona />
              <FormField label="Segundo apellido" name="segundoApellido" nombrePersona />
              <FormField label="Fecha de nacimiento" name="fechaNacimiento" type="date" />
              <FormSelect label="Sexo" name="sexo">
                <option value="">Selecciona</option>
                <option value="H">Hombre</option>
                <option value="M">Mujer</option>
              </FormSelect>
              <FormField label="Clave de elector" name="claveElector" className="sm:col-span-2" />
              <FormField
                label="CURP"
                name="curp"
                className="sm:col-span-2 uppercase"
                readOnly={requiereVerificacionCurp}
              />
              <div className="sm:col-span-2">
                <span className="label">Sección electoral</span>
                <p className="mt-1 text-sm font-medium text-ink">
                  {etiquetaSeccion(seccionAsignada)}
                </p>
              </div>
            </div>
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Domicilio</h2>
            <div className="grid gap-4 form-grid">
              <CodigoPostalColoniaFields />
              <FormField label="Calle" name="calle" className="sm:col-span-2" />
              <FormField label="Número exterior" name="numeroExterior" />
              <FormField label="Número interior" name="numeroInterior" />
            </div>
          </section>

          <section className="card-section space-y-4">
            <h2 className="section-title">Fotografías de la credencial</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <ImageUploadField
                name="ineFrenteUrl"
                label="Anverso (frente)"
                previewAlt="Credencial anverso"
              />
              <ImageUploadField
                name="ineReversoUrl"
                label="Reverso (atrás)"
                previewAlt="Credencial reverso"
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
