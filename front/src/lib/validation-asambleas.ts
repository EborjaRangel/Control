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
    .typeError("Personas requeridas inválidas")
    .integer("Debe ser un número entero")
    .min(0, "No puede ser negativa")
    .required("Indica el número de personas requeridas"),
  cantidadReal: Yup.number()
    .transform((_value, originalValue) => {
      if (originalValue === "" || originalValue == null) return undefined;
      const n = Number(originalValue);
      return Number.isNaN(n) ? originalValue : n;
    })
    .typeError("Asistencia inválida")
    .integer("Debe ser un número entero")
    .min(0, "No puede ser negativa")
    .required("Indica el número de personas que asistieron"),
  fotos: Yup.array()
    .of(Yup.string().trim().required("Foto inválida"))
    .min(1, "Sube al menos una fotografía del evento")
    .max(MAX_FOTOS_ASAMBLEA, `Máximo ${MAX_FOTOS_ASAMBLEA} fotografías`),
});

export const asambleaAdminFieldsSchema = Yup.object({
  titulo: Yup.string().trim().required("El título es obligatorio"),
  descripcion: Yup.string().trim().required("La descripción es obligatoria"),
  calificacion: Yup.number()
    .transform((_value, originalValue) => {
      if (originalValue === "" || originalValue == null) return undefined;
      const n = Number(originalValue);
      return Number.isNaN(n) ? originalValue : n;
    })
    .typeError("Calificación inválida")
    .integer("Debe ser un número entero")
    .min(1, "Mínimo 1")
    .max(5, "Máximo 5")
    .required("Indica la calificación (1 a 5)"),
  observacion: Yup.string().trim().nullable(),
});

export const asambleaAdminSchema = asambleaBaseSchema.concat(asambleaAdminFieldsSchema);

export type AsambleaFormValues = Yup.InferType<typeof asambleaBaseSchema>;
export type AsambleaAdminFormValues = Yup.InferType<typeof asambleaAdminSchema>;

export const EMPTY_ASAMBLEA_ADMIN: AsambleaAdminFormValues = {
  titulo: "",
  descripcion: "",
  calificacion: 3,
  observacion: "",
  fecha: "",
  hora: "",
  lugar: "",
  lat: 0,
  lng: 0,
  seccionElectoral: "",
  cantidadConvocada: 0,
  cantidadReal: 0,
  fotos: [],
};
