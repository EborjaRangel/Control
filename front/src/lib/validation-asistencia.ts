import * as Yup from "yup";
import { NOMBRES_COLONIAS_COYOACAN } from "./colonias";
import { TIPOS_DIRIGENTE } from "./dirigentes";
import {
  DISTRITOS_LOCALES_COYOACAN,
  SECCIONES_ELECTORALES_COYOACAN,
} from "./secciones-electorales";
import type { AlcanceEvento } from "./asistencia";

export const ALCANCES_EVENTO = [
  "COLONIA",
  "SECCION",
  "UNIDAD_TERRITORIAL",
  "DISTRITO",
  "TIPO_DIRIGENTE",
] as const satisfies readonly AlcanceEvento[];

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
          .oneOf(NOMBRES_COLONIAS_COYOACAN, "Selecciona una colonia válida")
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
  distritoLocal: Yup.string()
    .nullable()
    .when("alcance", {
      is: "DISTRITO",
      then: (s) =>
        s.test(
          "distrito",
          "Distrito inválido",
          (v) =>
            v == null ||
            v === "" ||
            DISTRITOS_LOCALES_COYOACAN.map(String).includes(v),
        ),
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
  raw: Yup.string().trim().required("Código QR requerido"),
});

export type EventoFormValues = Omit<
  Yup.InferType<typeof eventoCreateSchema>,
  "alcance"
> & {
  alcance: AlcanceEvento | "";
};
export type RegistrarAsistenciaFormValues = Yup.InferType<typeof registrarAsistenciaSchema>;

export const EMPTY_EVENTO: EventoFormValues = {
  titulo: "",
  fecha: "",
  hora: "",
  lugar: "",
  alcance: "",
  colonia: "",
  seccionElectoral: "",
  unidadTerritorialId: "",
  distritoLocal: "",
  tipoDirigente: "",
};

export function eventoFormToApiBody(
  values: EventoFormValues,
): Record<string, string | number | null> {
  const body: Record<string, string | number | null> = {
    titulo: values.titulo.trim(),
    fecha: values.fecha,
    hora: values.hora,
    lugar: values.lugar.trim(),
    alcance: values.alcance,
  };
  if (values.alcance === "COLONIA") body.colonia = values.colonia ?? null;
  if (values.alcance === "SECCION") body.seccionElectoral = values.seccionElectoral ?? null;
  if (values.alcance === "UNIDAD_TERRITORIAL") {
    body.unidadTerritorialId = values.unidadTerritorialId ?? null;
  }
  if (values.alcance === "DISTRITO") {
    body.distritoLocal = values.distritoLocal ? Number(values.distritoLocal) : null;
  }
  if (values.alcance === "TIPO_DIRIGENTE") body.tipoDirigente = values.tipoDirigente ?? null;
  return body;
}
