"use client";

import { Form, Formik, useField, useFormikContext } from "formik";
import { codigoQrDesdeTextoQr } from "@/lib/qr";
import { cn } from "@/lib/cn";
import {
  registrarAsistenciaSchema,
  type RegistrarAsistenciaFormValues,
} from "@/lib/validation-asistencia";

type Props = {
  onSubmit: (values: RegistrarAsistenciaFormValues) => Promise<void>;
};

function RawQrInput() {
  const { submitCount } = useFormikContext<RegistrarAsistenciaFormValues>();
  const [field, meta] = useField("raw");
  const hasError = Boolean(meta.error && (meta.touched || submitCount > 0));

  return (
    <div className="min-w-0 flex-1">
      <input
        {...field}
        className={cn("input-search w-full", hasError && "input-error")}
        placeholder="Código QR, URL o contenido escaneado…"
      />
      {hasError ? <p className="field-error mt-1">{meta.error}</p> : null}
    </div>
  );
}

function CodigoDetectado() {
  const { values } = useFormikContext<RegistrarAsistenciaFormValues>();
  if (!values.raw.trim()) return null;
  return (
    <p className="text-xs text-ink-secondary">
      Código detectado:{" "}
      <span className="font-mono">{codigoQrDesdeTextoQr(values.raw) ?? "—"}</span>
    </p>
  );
}

export function RegistrarAsistenciaQrForm({ onSubmit }: Props) {
  return (
    <Formik
      initialValues={{ raw: "" }}
      validationSchema={registrarAsistenciaSchema}
      onSubmit={async (values, { setSubmitting, resetForm }) => {
        try {
          await onSubmit(values);
          resetForm();
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting }) => (
        <Form className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <RawQrInput />
            <button
              type="submit"
              className="btn-primary btn-responsive shrink-0"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Registrando…" : "Registrar"}
            </button>
          </div>
          <CodigoDetectado />
        </Form>
      )}
    </Formik>
  );
}
