import * as Yup from "yup";
import { NOMBRES_COLONIAS_COYOACAN } from "./colonias.js";
import { TIPOS_DIRIGENTE } from "./dirigentes.js";
import {
  DISTRITOS_FEDERALES_COYOACAN,
  DISTRITOS_LOCALES_COYOACAN,
  SECCIONES_ELECTORALES_COYOACAN,
} from "./secciones-electorales.js";

export const ALCANCES_NOTIFICACION = [
  "TODOS",
  "TIPO_DIRIGENTE",
  "DISTRITO_FEDERAL",
  "DISTRITO_LOCAL",
  "COLONIA",
  "UNIDAD_TERRITORIAL",
  "SECCION",
] as const;

export type AlcanceNotificacionInput = (typeof ALCANCES_NOTIFICACION)[number];

export const notificacionEnviarSchema = Yup.object({
  mensaje: Yup.string()
    .transform((v) => (typeof v === "string" ? v.trim().toUpperCase() : v))
    .min(10, "El mensaje debe tener al menos 10 caracteres")
    .max(2000, "Máximo 2000 caracteres")
    .required("Escribe el mensaje de la notificación"),
  alcance: Yup.string()
    .oneOf([...ALCANCES_NOTIFICACION], "Alcance inválido")
    .required("Selecciona el alcance"),
  colonia: Yup.string()
    .nullable()
    .when("alcance", {
      is: "COLONIA",
      then: (s) =>
        s
          .oneOf(NOMBRES_COLONIAS_COYOACAN, "Colonia inválida")
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
    .transform((_v, orig) => {
      if (orig === "" || orig == null) return null;
      const n = Number(orig);
      return Number.isNaN(n) ? orig : n;
    })
    .when("alcance", {
      is: "DISTRITO_LOCAL",
      then: (s) =>
        s
          .oneOf([...DISTRITOS_LOCALES_COYOACAN], "Distrito local inválido")
          .required("Selecciona el distrito local"),
    }),
  distritoFederal: Yup.number()
    .nullable()
    .transform((_v, orig) => {
      if (orig === "" || orig == null) return null;
      const n = Number(orig);
      return Number.isNaN(n) ? orig : n;
    })
    .when("alcance", {
      is: "DISTRITO_FEDERAL",
      then: (s) =>
        s
          .oneOf([...DISTRITOS_FEDERALES_COYOACAN], "Distrito federal inválido")
          .required("Selecciona el distrito federal"),
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
