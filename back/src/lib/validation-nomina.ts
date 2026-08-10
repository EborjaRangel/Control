import * as Yup from "yup";
import { CONCEPTOS_SUELDO_CATALOGO, MAX_CONCEPTOS_COMPOSICION, TIPOS_DETALLE_SUELDO } from "./composicion-sueldo.js";

function montoSueldo(label = "Monto inválido") {
  return Yup.number()
    .transform((_value, originalValue) => {
      if (originalValue === "" || originalValue == null) return 0;
      const cleaned =
        typeof originalValue === "string"
          ? originalValue.replace(/[^\d.]/g, "")
          : originalValue;
      const n = Number(cleaned);
      if (Number.isNaN(n)) return originalValue;
      // Evita ceros a la derecha en el valor numérico (100.50 → 100.5).
      return Number(String(n));
    })
    .typeError(label)
    .min(0, "No puede ser negativo")
    .default(0);
}

export const conceptoComposicionSchema = Yup.object({
  concepto: Yup.string()
    .oneOf([...CONCEPTOS_SUELDO_CATALOGO], "Concepto inválido")
    .required("Selecciona un concepto"),
  monto: montoSueldo(),
  nombre: Yup.string().trim().nullable(),
  tipoDetalle: Yup.string()
    .oneOf([...TIPOS_DETALLE_SUELDO], "Selecciona Titular o Chambelán")
    .required("Selecciona Titular o Chambelán"),
});

export const nominaSchema = Yup.object({
  conceptosComposicion: Yup.array()
    .of(conceptoComposicionSchema)
    .max(MAX_CONCEPTOS_COMPOSICION, `Máximo ${MAX_CONCEPTOS_COMPOSICION} conceptos`)
    .default([]),
});

export type NominaFormValues = Yup.InferType<typeof nominaSchema>;
