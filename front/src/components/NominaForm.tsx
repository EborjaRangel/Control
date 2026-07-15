"use client";

import { Form, Formik } from "formik";
import { calcularSueldo } from "@/lib/dirigentes";
import { nominaSchema, type NominaFormValues } from "@/lib/validation";
import { ComposicionSueldoFields } from "@/components/ComposicionSueldoFields";
import { SueldoDesglose } from "@/components/SueldoDesglose";

type Props = {
  initialValues: NominaFormValues;
  saving?: boolean;
  onSubmit: (values: NominaFormValues) => Promise<void>;
};

export function NominaForm({ initialValues, saving = false, onSubmit }: Props) {
  return (
    <Formik
      initialValues={initialValues}
      validationSchema={nominaSchema}
      enableReinitialize
      onSubmit={async (values, { setSubmitting }) => {
        try {
          await onSubmit(values);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, isSubmitting }) => {
        const desglose = calcularSueldo(
          (values.conceptosComposicion ?? []).map((c) => ({
            concepto: c.concepto,
            monto: Number(c.monto) || 0,
            nombre: c.nombre,
            tipoDetalle: c.tipoDetalle,
          })),
        );

        return (
          <Form className="card-section space-y-4">
            <div>
              <h2 className="section-title">Editar nómina</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Los cambios se guardan en la base de datos.
              </p>
            </div>

            <ComposicionSueldoFields />
            <SueldoDesglose desglose={desglose} />

            <div className="divider flex justify-end pt-2">
              <button
                type="submit"
                className="btn-primary btn-responsive"
                disabled={isSubmitting || saving}
              >
                {isSubmitting || saving ? "Guardando…" : "Guardar nómina"}
              </button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
