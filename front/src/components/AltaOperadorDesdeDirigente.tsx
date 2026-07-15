"use client";

import Link from "next/link";
import { Form, Formik } from "formik";
import { useState } from "react";
import { FormField } from "@/components/FormField";
import {
  BuscarDirigenteParaOperador,
  type DirigenteParaOperador,
} from "@/components/BuscarDirigenteParaOperador";
import { nombreCompleto, TIPO_DIRIGENTE_LABEL } from "@/lib/dirigentes";
import { etiquetaSeccion } from "@/lib/secciones-electorales";
import { etiquetaUnidadTerritorial } from "@/lib/unidades-territoriales";
import {
  rcCreateSchema,
  rgCreateSchema,
} from "@/lib/validation-rc-rg";
import { credencialesPorDefecto } from "@/lib/credenciales-usuario";

type Props = {
  modo: "rc" | "rg";
  titulo: string;
  subtitulo: string;
  submitLabel: string;
  cancelHref: string;
  onSubmit: (payload: { dirigenteId: string; usuario: string; password: string }) => Promise<void>;
};

export function AltaOperadorDesdeDirigente({
  modo,
  titulo,
  subtitulo,
  submitLabel,
  cancelHref,
  onSubmit,
}: Props) {
  const [dirigente, setDirigente] = useState<DirigenteParaOperador | null>(null);
  const schema = modo === "rc" ? rcCreateSchema : rgCreateSchema;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">{titulo}</h1>
          <p className="page-subtitle">{subtitulo}</p>
        </div>
      </div>

      <BuscarDirigenteParaOperador
        modo={modo}
        selectedId={dirigente?.id ?? null}
        onSelect={setDirigente}
      />

      {dirigente ? (
        <>
          <section className="card-section space-y-2">
            <h2 className="section-title">Dirigente seleccionado</h2>
            <p className="font-semibold text-ink">{nombreCompleto(dirigente)}</p>
            <p className="text-sm text-ink-secondary">
              {TIPO_DIRIGENTE_LABEL[dirigente.tipo as keyof typeof TIPO_DIRIGENTE_LABEL] ??
                dirigente.tipo}
              {" · "}
              {dirigente.colonia}
              {" · "}
              {etiquetaSeccion(dirigente.seccionElectoral)}
              {dirigente.unidadTerritorial
                ? ` · ${etiquetaUnidadTerritorial(dirigente.unidadTerritorial)}`
                : ""}
            </p>
            <p className="text-sm text-ink-secondary">Celular: {dirigente.telefonoCelular}</p>
          </section>

          <Formik
            initialValues={{
              ...credencialesPorDefecto(dirigente.nombre, dirigente.primerApellido),
              dirigenteId: dirigente.id,
            }}
            validationSchema={schema}
            enableReinitialize
            onSubmit={async (values, { setSubmitting, setStatus }) => {
              try {
                await onSubmit({
                  dirigenteId: dirigente.id,
                  usuario: values.usuario.trim(),
                  password: values.password,
                });
              } catch (err) {
                setStatus({
                  apiError: err instanceof Error ? err.message : "Error al guardar",
                });
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting, status }) => (
              <Form className="card-section space-y-4">
                <h2 className="section-title">Acceso al sistema</h2>
                <div className="grid gap-4 form-grid">
                  <FormField label="Usuario" name="usuario" autoComplete="username" />
                  <FormField
                    label="Contraseña"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                  />
                </div>
                {status?.apiError ? <div className="alert-error">{status.apiError}</div> : null}
                <div className="divider flex flex-wrap justify-end gap-3 pt-2">
                  <Link href={cancelHref} className="btn-ghost btn-responsive">
                    Cancelar
                  </Link>
                  <button
                    type="submit"
                    className="btn-primary btn-responsive"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Guardando…" : submitLabel}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </>
      ) : null}
    </div>
  );
}
