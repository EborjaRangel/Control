import * as Yup from "yup";
import { TIPOS_DIRIGENTE } from "./dirigentes";
import { CONCEPTOS_SUELDO_CATALOGO, MAX_CONCEPTOS_COMPOSICION } from "./composicion-sueldo";
import { COLONIAS_COYOACAN, coloniaCoincideConCp, CODIGOS_POSTALES_COYOACAN, esColoniaValida } from "./colonias";
import { SECCIONES_ELECTORALES_COYOACAN, esSeccionValida } from "./secciones-electorales";
import { credencialesCreateSchema, credencialesUpdateSchema } from "./auth";
import { dirigenteExtraSchema } from "./validation-dirigente-extra";

export {
  estudioSchema,
  redSocialSchema,
  contactoEmergenciaSchema,
  ingresoSchema,
  dirigenteExtraSchema,
} from "./validation-dirigente-extra";

function cadenaNula(value: unknown): string | null {
  if (value == null || value === "") return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function montoSueldo(label = "Monto inválido") {
  return Yup.number()
    .transform((_value, originalValue) => {
      if (originalValue === "" || originalValue == null) return 0;
      const n = Number(originalValue);
      return Number.isNaN(n) ? originalValue : n;
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
  tipoDetalle: Yup.string().trim().nullable(),
});

export const nominaSchema = Yup.object({
  conceptosComposicion: Yup.array()
    .of(conceptoComposicionSchema)
    .max(MAX_CONCEPTOS_COMPOSICION, `Máximo ${MAX_CONCEPTOS_COMPOSICION} conceptos`)
    .default([]),
});

export type NominaFormValues = Yup.InferType<typeof nominaSchema>;

export const dirigenteSchema = Yup.object({
  // Datos personales
  nombre: Yup.string().trim().required("El nombre es obligatorio"),
  primerApellido: Yup.string().trim().required("El primer apellido es obligatorio"),
  segundoApellido: Yup.string().trim().nullable(),
  fechaNacimiento: Yup.string()
    .required("La fecha de nacimiento es obligatoria")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Fecha inv?lida"),
  telefonoCelular: Yup.string()
    .trim()
    .matches(/^\d{10}$/, "El celular debe tener 10 d?gitos")
    .required("El celular es obligatorio"),
  correo: Yup.string()
    .trim()
    .email("Correo electr?nico inv?lido")
    .required("El correo es obligatorio"),
  fotoUrl: Yup.string().nullable(),

  // Clasificaci?n y secci?n
  tipo: Yup.string()
    .oneOf([...TIPOS_DIRIGENTE], "Tipo de dirigente inv?lido")
    .required("El tipo de dirigente es obligatorio"),
  seccionElectoral: Yup.string()
    .required("La sección electoral es obligatoria")
    .test(
      "seccion-valida",
      "Selecciona una sección electoral de Coyoacán",
      (v) => Boolean(v && esSeccionValida(v)),
    ),

  // Direcci?n (Coyoac?n)
  colonia: Yup.string()
    .required("La colonia es obligatoria")
    .test(
      "colonia-valida",
      "Selecciona una colonia de Coyoacán",
      (v) => Boolean(v && esColoniaValida(v)),
    )
    .test(
      "colonia-coincide-cp",
      "La colonia no corresponde al código postal seleccionado",
      function (colonia) {
        const { codigoPostal } = this.parent as { codigoPostal?: string };
        if (!colonia || !codigoPostal) return true;
        return coloniaCoincideConCp(colonia, codigoPostal);
      },
    ),
  calle: Yup.string().trim().required("La calle es obligatoria"),
  numeroExterior: Yup.string().trim().required("El n?mero exterior es obligatorio"),
  numeroInterior: Yup.string().trim().nullable(),
  codigoPostal: Yup.string()
    .oneOf([...CODIGOS_POSTALES_COYOACAN], "Selecciona un c?digo postal de Coyoac?n")
    .required("El c?digo postal es obligatorio"),

  unidadTerritorialId: Yup.string().transform(cadenaNula).nullable(),
})
  .concat(dirigenteExtraSchema)
  .concat(nominaSchema);

export const dirigenteCreateSchema = dirigenteSchema.concat(credencialesCreateSchema);
export const dirigenteUpdateSchema = dirigenteSchema.concat(credencialesUpdateSchema);

export type DirigenteFormValues = Yup.InferType<typeof dirigenteSchema> & {
  usuario: string;
  password?: string | null;
};
