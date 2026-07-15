import * as Yup from "yup";
import { NOMBRES_COLONIAS_COYOACAN } from "./colonias";
import { TIPOS_DIRIGENTE } from "./dirigentes";
import {
  DISTRITOS_FEDERALES_COYOACAN,
  DISTRITOS_LOCALES_COYOACAN,
  SECCIONES_ELECTORALES_COYOACAN,
} from "./secciones-electorales";
import type { AlcanceNotificacion } from "./notificaciones";

export const ALCANCES_NOTIFICACION = [
  "TODOS",
  "TIPO_DIRIGENTE",
  "DISTRITO_FEDERAL",
  "DISTRITO_LOCAL",
  "COLONIA",
  "UNIDAD_TERRITORIAL",
  "SECCION",
] as const satisfies readonly AlcanceNotificacion[];

export type NotificacionFormValues = {
  mensaje: string;
  alcance: AlcanceNotificacion | "";
  colonia: string;
  seccionElectoral: string;
  unidadTerritorialId: string;
  distritoLocal: string;
  distritoFederal: string;
  tipoDirigente: string;
};

export const EMPTY_NOTIFICACION: NotificacionFormValues = {
  mensaje: "",
  alcance: "",
  colonia: "",
  seccionElectoral: "",
  unidadTerritorialId: "",
  distritoLocal: "",
  distritoFederal: "",
  tipoDirigente: "",
};

export const notificacionEnviarSchema = Yup.object({
  mensaje: Yup.string()
    .transform((v) => (typeof v === "string" ? v.trim().toUpperCase() : v))
    .min(10, "Mínimo 10 caracteres")
    .max(2000, "Máximo 2000 caracteres")
    .required("Escribe el mensaje"),
  alcance: Yup.string()
    .oneOf([...ALCANCES_NOTIFICACION], "Alcance inválido")
    .required("Selecciona el alcance"),
  colonia: Yup.string().when("alcance", {
    is: "COLONIA",
    then: (s) =>
      s
        .oneOf(NOMBRES_COLONIAS_COYOACAN, "Colonia inválida")
        .required("Selecciona colonia"),
    otherwise: (s) => s.optional(),
  }),
  seccionElectoral: Yup.string().when("alcance", {
    is: "SECCION",
    then: (s) =>
      s
        .oneOf([...SECCIONES_ELECTORALES_COYOACAN], "Sección inválida")
        .required("Selecciona sección"),
    otherwise: (s) => s.optional(),
  }),
  unidadTerritorialId: Yup.string().when("alcance", {
    is: "UNIDAD_TERRITORIAL",
    then: (s) => s.required("Selecciona UT"),
    otherwise: (s) => s.optional(),
  }),
  distritoLocal: Yup.string().when("alcance", {
    is: "DISTRITO_LOCAL",
    then: (s) =>
      s
        .oneOf(DISTRITOS_LOCALES_COYOACAN.map(String), "Distrito inválido")
        .required("Selecciona distrito local"),
    otherwise: (s) => s.optional(),
  }),
  distritoFederal: Yup.string().when("alcance", {
    is: "DISTRITO_FEDERAL",
    then: (s) =>
      s
        .oneOf(DISTRITOS_FEDERALES_COYOACAN.map(String), "Distrito inválido")
        .required("Selecciona distrito federal"),
    otherwise: (s) => s.optional(),
  }),
  tipoDirigente: Yup.string().when("alcance", {
    is: "TIPO_DIRIGENTE",
    then: (s) =>
      s.oneOf([...TIPOS_DIRIGENTE], "Tipo inválido").required("Selecciona tipo"),
    otherwise: (s) => s.optional(),
  }),
});

export function payloadFromNotificacionForm(values: NotificacionFormValues) {
  return {
    mensaje: values.mensaje.trim().toUpperCase(),
    alcance: values.alcance,
    colonia: values.alcance === "COLONIA" ? values.colonia : null,
    seccionElectoral: values.alcance === "SECCION" ? values.seccionElectoral : null,
    unidadTerritorialId:
      values.alcance === "UNIDAD_TERRITORIAL" ? values.unidadTerritorialId : null,
    distritoLocal:
      values.alcance === "DISTRITO_LOCAL" && values.distritoLocal
        ? Number(values.distritoLocal)
        : null,
    distritoFederal:
      values.alcance === "DISTRITO_FEDERAL" && values.distritoFederal
        ? Number(values.distritoFederal)
        : null,
    tipoDirigente: values.alcance === "TIPO_DIRIGENTE" ? values.tipoDirigente : null,
  };
}
