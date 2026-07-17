import * as Yup from "yup";
import {
  FILIACIONES_PARTIDO,
  PARENTESCOS_EMERGENCIA,
  STATUS_DIRIGENTE,
  TIPOS_RED_SOCIAL,
} from "./dirigente-spec";
import {
  DISTRITOS_FEDERALES_COYOACAN,
  DISTRITOS_LOCALES_COYOACAN,
} from "./secciones-electorales";

function cadenaNula(value: unknown): string | null {
  if (value == null || value === "") return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function filtrarEstudios(arr: unknown) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (e) => e && typeof e === "object" && String((e as { descripcion?: string }).descripcion ?? "").trim(),
  );
}

function filtrarRedes(arr: unknown) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (e) => e && typeof e === "object" && String((e as { cuenta?: string }).cuenta ?? "").trim(),
  );
}

function filtrarContactos(arr: unknown) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (e) => e && typeof e === "object" && String((e as { nombre?: string }).nombre ?? "").trim(),
  );
}

function filtrarIngresos(arr: unknown) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(
    (e) =>
      e && typeof e === "object" && String((e as { tipoIngreso?: string }).tipoIngreso ?? "").trim(),
  );
}
function montoOpcional() {
  return Yup.number()
    .transform((_value, originalValue) => {
      if (originalValue === "" || originalValue == null) return undefined;
      const n = Number(originalValue);
      return Number.isNaN(n) ? originalValue : n;
    })
    .typeError("Monto inválido")
    .min(0, "No puede ser negativo");
}

export const estudioSchema = Yup.object({
  descripcion: Yup.string().trim().required("Descripción requerida"),
  institucion: Yup.string().trim().nullable(),
  anioEgreso: Yup.number()
    .transform((_v, o) => (o === "" || o == null ? undefined : Number(o)))
    .nullable()
    .min(1900, "Año inválido")
    .max(new Date().getFullYear(), "Año inválido"),
  cedula: Yup.string().trim().nullable(),
  certificado: Yup.boolean().required(),
  otros: Yup.string().trim().nullable(),
});

export const redSocialSchema = Yup.object({
  descripcion: Yup.string()
    .oneOf([...TIPOS_RED_SOCIAL], "Tipo de red inválido")
    .required("Tipo requerido"),
  cuenta: Yup.string().trim().required("Cuenta requerida"),
});

export const contactoEmergenciaSchema = Yup.object({
  nombre: Yup.string().trim().required("Nombre requerido"),
  parentesco: Yup.string()
    .oneOf([...PARENTESCOS_EMERGENCIA], "Parentesco inválido")
    .required("Parentesco requerido"),
  telefono: Yup.string()
    .trim()
    .matches(/^\d{10}$/, "Teléfono de 10 dígitos")
    .required("Teléfono requerido"),
});

export const ingresoSchema = Yup.object({
  tipoIngreso: Yup.string()
    .trim()
    .required("Indica el tipo de ingreso o actividad económica"),
  monto: montoOpcional().nullable().default(0),
});

export const dirigenteExtraSchema = Yup.object({
  alias: Yup.string().trim().nullable(),
  curp: Yup.string()
    .trim()
    .uppercase()
    .transform((v) => v || null)
    .nullable()
    .test("curp", "CURP inválida", (v) =>
      !v ? true : /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(v),
    ),
  tieneIne: Yup.boolean().required(),
  ineFrenteUrl: Yup.string().nullable().when("tieneIne", {
    is: true,
    then: (s) => s.required("Sube el frente de la credencial"),
  }),
  ineReversoUrl: Yup.string().nullable().when("tieneIne", {
    is: true,
    then: (s) => s.required("Sube el reverso de la credencial"),
  }),
  distritoFederal: Yup.number()
    .transform((_v, o) => (o === "" || o == null ? null : Number(o)))
    .nullable()
    .oneOf([...DISTRITOS_FEDERALES_COYOACAN, null], "Distrito federal inválido"),
  distritoLocal: Yup.number()
    .transform((_v, o) => (o === "" || o == null ? null : Number(o)))
    .nullable()
    .oneOf([...DISTRITOS_LOCALES_COYOACAN, null], "Selecciona distrito local 26 o 30"),
  alcaldia: Yup.string().trim().default("Coyoacán"),
  estadoRepublica: Yup.string().trim().default("Ciudad de México"),
  filiacion: Yup.string()
    .trim()
    .transform((v) => v || null)
    .nullable()
    .oneOf([...FILIACIONES_PARTIDO, null], "Filiación inválida"),
  aspiracionCortoPlazo: Yup.string().trim().nullable(),
  aspiracionLargoPlazo: Yup.string().trim().nullable(),
  referenteId: Yup.string().transform(cadenaNula).nullable(),
  antecedentesPoliticos: Yup.string().trim().nullable(),
  notasCoordinacion: Yup.string().trim().nullable(),
  status: Yup.string()
    .oneOf([...STATUS_DIRIGENTE], "Estatus inválido")
    .default("ACTIVO"),
  estudios: Yup.array()
    .transform(filtrarEstudios)
    .of(estudioSchema)
    .default([]),
  redesSociales: Yup.array()
    .transform(filtrarRedes)
    .of(redSocialSchema)
    .default([]),
  contactosEmergencia: Yup.array()
    .transform(filtrarContactos)
    .of(contactoEmergenciaSchema)
    .default([]),
  ingresos: Yup.array()
    .transform(filtrarIngresos)
    .of(ingresoSchema)
    .default([]),
});
