"use client";

import { Form, Formik } from "formik";
import Link from "next/link";
import { useState } from "react";
import { FormField, FormSelect } from "@/components/FormField";
import { ImageUploadField } from "@/components/ImageUploadField";
import { apiFetch } from "@/lib/api";
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
  /** En alta nueva: pedir CURP y validar en BD antes del resto del formulario. */
  requiereVerificacionCurp?: boolean;
  /** Al editar: excluir este registro al verificar duplicados. */
  excludeDetectadoId?: string;
};

const MENSAJE_CURP_DETECTADO_DUPLICADA =
  "Esa CURP ya existe. Imposible duplicar un detectado.";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

export function DetectadoForm({
  initialValues,
  onSubmit,
  cancelHref,
  submitLabel = "Guardar",
  modo = "crear",
  seccionFija,
  requiereVerificacionCurp = modo === "crear",
  excludeDetectadoId,
}: Props) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [curpVerificada, setCurpVerificada] = useState(!requiereVerificacionCurp);
  const [curpInput, setCurpInput] = useState(initialValues.curp ?? "");
  const [curpError, setCurpError] = useState<string | null>(null);
  const [verificandoCurp, setVerificandoCurp] = useState(false);
  const schema = modo === "crear" ? detectadoCreateSchema : detectadoUpdateSchema;

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
      if (excludeDetectadoId) params.set("excludeDetectadoId", excludeDetectadoId);
      const res = await apiFetch(`/api/detectados/verificar-curp?${params}`);
      const data = (await res.json()) as { disponible?: boolean; error?: string; curp?: string };
      if (!res.ok || !data.disponible) {
        setCurpError(data.error ?? MENSAJE_CURP_DETECTADO_DUPLICADA);
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
            Antes de capturar los datos del detectado, ingresa su CURP. Solo se puede registrar
            una vez en todo el sistema, sin importar el dirigente.
          </p>
          <label className="label">
            CURP
            <input
              id="detectado-curp-verificacion"
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

  const formInitialValues: DetectadoFormValues = {
    ...initialValues,
    curp: requiereVerificacionCurp ? curpInput : initialValues.curp,
    ...(seccionFija ? { seccionElectoral: seccionFija } : {}),
  };

  return (
    <Formik
      initialValues={formInitialValues}
      validationSchema={schema}
      enableReinitialize
      onSubmit={async (values, { setSubmitting }) => {
        setApiError(null);
        try {
          await onSubmit({
            ...values,
            curp: requiereVerificacionCurp ? curpInput : values.curp,
            ...(seccionFija ? { seccionElectoral: seccionFija } : {}),
          });
        } catch (err) {
          setApiError(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, values }) => (
        <Form className="card-section space-y-6">
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
          ) : (
            <section className="space-y-4">
              <h2 className="section-title">Identificación</h2>
              <FormField label="CURP" name="curp" className="uppercase" maxLength={18} />
            </section>
          )}

          <section className="space-y-4">
            <h2 className="section-title">Datos del detectado</h2>
            <div className="grid gap-4 form-grid">
              <FormField label="Nombre(s)" name="nombre" nombrePersona />
              <FormField label="Primer apellido" name="primerApellido" nombrePersona />
              <FormField label="Segundo apellido" name="segundoApellido" nombrePersona />
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
            <h2 className="section-title">Credencial de elector</h2>
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
