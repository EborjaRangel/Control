"use client";

import { FieldArray, useFormikContext } from "formik";
import { FormField, FormSelect } from "@/components/FormField";
import {
  CONCEPTOS_SUELDO_CATALOGO,
  CONCEPTO_SUELDO_LABEL,
  MAX_CONCEPTOS_COMPOSICION,
} from "@/lib/composicion-sueldo";
import type { NominaFormValues } from "@/lib/validation";

type Props = {
  /** Prefijo para nombres anidados (p. ej. en formulario de dirigente). */
  namePrefix?: string;
};

function fieldName(prefix: string | undefined, name: string) {
  return prefix ? `${prefix}.${name}` : name;
}

export function ComposicionSueldoFields({ namePrefix }: Props) {
  const { values } = useFormikContext<Record<string, unknown>>();
  const nomina = (namePrefix
    ? (values[namePrefix] as NominaFormValues | undefined)
    : (values as NominaFormValues)) ?? { conceptosComposicion: [] };
  const conceptos = nomina.conceptosComposicion ?? [];
  const arrayName = fieldName(namePrefix, "conceptosComposicion");

  return (
    <FieldArray name={arrayName}>
      {({ push, remove }) => (
        <>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-ink">Composición del sueldo</h3>
              <p className="text-xs text-ink-secondary">
                Agrega líneas con concepto del catálogo, monto, nombre y tipo.
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary btn-sm btn-responsive"
              disabled={conceptos.length >= MAX_CONCEPTOS_COMPOSICION}
              onClick={() =>
                push({ concepto: "BASE", monto: 0, nombre: "", tipoDetalle: "" })
              }
            >
              + Agregar otro sueldo
            </button>
          </div>
          <div className="space-y-3">
            {conceptos.length === 0 ? (
              <p className="text-sm text-ink-secondary">Sin conceptos registrados.</p>
            ) : null}
            {conceptos.map((_, index) => (
              <div
                key={index}
                className="panel-soft grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_auto]"
              >
                <FormSelect
                  label="Concepto"
                  name={`${arrayName}.${index}.concepto`}
                >
                  {CONCEPTOS_SUELDO_CATALOGO.map((c) => (
                    <option key={c} value={c}>
                      {CONCEPTO_SUELDO_LABEL[c]}
                    </option>
                  ))}
                </FormSelect>
                <FormField
                  label="Monto (MXN)"
                  name={`${arrayName}.${index}.monto`}
                  type="number"
                  min={0}
                  step="0.01"
                />
                <FormField
                  label="Nombre"
                  name={`${arrayName}.${index}.nombre`}
                />
                <FormField
                  label="Tipo"
                  name={`${arrayName}.${index}.tipoDetalle`}
                />
                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                  <button
                    type="button"
                    className="btn-danger btn-sm btn-responsive w-full"
                    onClick={() => remove(index)}
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </FieldArray>
  );
}
