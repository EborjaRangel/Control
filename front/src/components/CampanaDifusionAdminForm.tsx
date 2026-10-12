"use client";

import { Field, Form, Formik } from "formik";
import { apiFetch } from "@/lib/api";
import type { CampanaDifusionDTO } from "@/lib/difusion";

type Props = {
  initial?: CampanaDifusionDTO;
  onSuccess: (campana: CampanaDifusionDTO) => void;
  onCancel: () => void;
};

type Values = {
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
};

export function CampanaDifusionAdminForm({ initial, onSuccess, onCancel }: Props) {
  const editando = Boolean(initial);

  return (
    <Formik<Values>
      initialValues={{
        titulo: initial?.titulo ?? "",
        fechaInicio: initial?.fechaInicio ?? "",
        fechaFin: initial?.fechaFin ?? "",
      }}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        setStatus(undefined);
        setSubmitting(true);
        try {
          const res = await apiFetch(
            editando ? `/api/difusion/campanas/${initial!.id}` : "/api/difusion/campanas",
            {
              method: editando ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(values),
            },
          );
          if (!res.ok) {
            const data = (await res.json()) as { error?: string };
            throw new Error(data.error ?? "Error al guardar");
          }
          onSuccess((await res.json()) as CampanaDifusionDTO);
        } catch (err) {
          setStatus(err instanceof Error ? err.message : "Error al guardar");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, status }) => (
        <Form className="card-section space-y-4">
          <label className="block">
            <span className="label">Título de la campaña</span>
            <Field name="titulo" className="input mt-1" required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Fecha de inicio</span>
              <Field name="fechaInicio" type="date" className="input mt-1" required />
            </label>
            <label className="block">
              <span className="label">Fecha de término</span>
              <Field name="fechaFin" type="date" className="input mt-1" required />
            </label>
          </div>
          {status ? <div className="alert-error text-sm">{status}</div> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="btn-primary btn-responsive" disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : editando ? "Guardar cambios" : "Crear campaña"}
            </button>
            <button type="button" className="btn-ghost btn-responsive" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
