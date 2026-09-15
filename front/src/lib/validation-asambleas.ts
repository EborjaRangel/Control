import * as Yup from "yup";
import { SECCIONES_ELECTORALES_COYOACAN } from "./secciones-electorales";

export const MAX_FOTOS_ASAMBLEA = 10;

export const asambleaBaseSchema = Yup.object({
  fecha: Yup.string()
    .required("La fecha es obligatoria")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora: Yup.string()
    .required("La hora es obligatoria")
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida (usa formato 24 h, ej. 14:30)"),
  lugar: Yup.string().trim().required("El lugar es obligatorio"),
  lat: Yup.number()
    .typeError("Ubica el lugar en el mapa")
    .required("Ubica el lugar en el mapa")
    .test("ubicado", "Ubica el lugar en el mapa", (v) => v != null && Math.abs(v) > 0.0001),
  lng: Yup.number()
    .typeError("Ubica el lugar en el mapa")
    .required("Ubica el lugar en el mapa")
    .test("ubicado", "Ubica el lugar en el mapa", (v) => v != null && Math.abs(v) > 0.0001),
  seccionElectoral: Yup.string()
    .oneOf([...SECCIONES_ELECTORALES_COYOACAN], "Sección electoral inválida")
    .required("La sección electoral es obligatoria"),
  cantidadConvocada: Yup.number()
    .transform((_value, originalValue) => {
      if (originalValue === "" || originalValue == null) return undefined;
      const n = Number(originalValue);
      return Number.isNaN(n) ? originalValue : n;
    })
    .typeError("Cantidad convocada inválida")
    .integer("Debe ser un número entero")
    .min(0, "No puede ser negativa")
    .required("Indica la cantidad convocada"),
  cantidadReal: Yup.number()
    .transform((_value, originalValue) => {
      if (originalValue === "" || originalValue == null) return undefined;
      const n = Number(originalValue);
      return Number.isNaN(n) ? originalValue : n;
    })
    .typeError("Cantidad real inválida")
    .integer("Debe ser un número entero")
    .min(0, "No puede ser negativa")
    .required("Indica la cantidad real"),
  fotos: Yup.array()
    .of(Yup.string().trim().required("Foto inválida"))
    .min(1, "Sube al menos una fotografía del evento")
    .max(MAX_FOTOS_ASAMBLEA, `Máximo ${MAX_FOTOS_ASAMBLEA} fotografías`),
});

export type AsambleaFormValues = Yup.InferType<typeof asambleaBaseSchema>;
