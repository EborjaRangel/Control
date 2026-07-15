import * as Yup from "yup";
import { COLONIAS_COYOACAN } from "./colonias.js";
import {
  DISTRITOS_LOCALES_COYOACAN,
  SECCIONES_ELECTORALES_COYOACAN,
} from "./secciones-electorales.js";
import { TIPOS_DIRIGENTE } from "./dirigentes.js";

const coloniaNombres = COLONIAS_COYOACAN.map((c) => c.nombre);

export const ALCANCES_EVENTO = [
  "COLONIA",
  "SECCION",
  "UNIDAD_TERRITORIAL",
  "DISTRITO",
  "TIPO_DIRIGENTE",
] as const;

export const eventoCreateSchema = Yup.object({
  titulo: Yup.string().trim().required("El título del evento es obligatorio"),
  fecha: Yup.string()
    .required("La fecha es obligatoria")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora: Yup.string()
    .trim()
    .required("La hora es obligatoria")
    .matches(/^\d{2}:\d{2}$/, "Hora inválida (usa HH:MM)"),
  lugar: Yup.string().trim().required("El lugar es obligatorio"),
  alcance: Yup.string()
    .oneOf([...ALCANCES_EVENTO], "Alcance inválido")
    .required("Selecciona el alcance del evento"),
  colonia: Yup.string()
    .nullable()
    .when("alcance", {
      is: "COLONIA",
      then: (s) =>
        s
          .oneOf(coloniaNombres, "Selecciona una colonia válida")
          .required("La colonia es obligatoria"),
    }),
  seccionElectoral: Yup.string()
    .nullable()
    .when("alcance", {
      is: "SECCION",
      then: (s) =>
        s
          .oneOf([...SECCIONES_ELECTORALES_COYOACAN], "Sección inválida")
          .required("La sección electoral es obligatoria"),
    }),
  unidadTerritorialId: Yup.string()
    .nullable()
    .when("alcance", {
      is: "UNIDAD_TERRITORIAL",
      then: (s) => s.required("La unidad territorial es obligatoria"),
    }),
  distritoLocal: Yup.number()
    .nullable()
    .transform((_v, orig) => (orig === "" || orig == null ? null : Number(orig)))
    .when("alcance", {
      is: "DISTRITO",
      then: (s) =>
        s
          .oneOf([...DISTRITOS_LOCALES_COYOACAN], "Distrito inválido")
          .nullable()
          .notRequired(),
    }),
  tipoDirigente: Yup.string()
    .nullable()
    .when("alcance", {
      is: "TIPO_DIRIGENTE",
      then: (s) =>
        s
          .oneOf([...TIPOS_DIRIGENTE], "Tipo de dirigente inválido")
          .required("Selecciona el tipo de dirigente"),
    }),
});

export const registrarAsistenciaSchema = Yup.object({
  codigoQr: Yup.string().trim().required("Código QR requerido"),
});

export type EventoCreateInput = Yup.InferType<typeof eventoCreateSchema>;
