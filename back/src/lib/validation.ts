import * as Yup from "yup";
import { TIPOS_DIRIGENTE } from "./dirigentes.js";
import { COLONIAS_COYOACAN, coloniaCoincideConCp, CODIGOS_POSTALES_COYOACAN, esColoniaValida } from "./colonias.js";
import { esSeccionValida } from "./secciones-electorales.js";
import { credencialesCreateSchema, credencialesUpdateSchema } from "./auth-validation.js";
import { nominaSchema } from "./validation-nomina.js";
import { dirigenteExtraSchema } from "./validation-dirigente-extra.js";

export {
  estudioSchema,
  redSocialSchema,
  contactoEmergenciaSchema,
  ingresoSchema,
  dirigenteExtraSchema,
} from "./validation-dirigente-extra.js";
export type { DirigenteFormPayload } from "./validation-dirigente-extra.js";

export { conceptoComposicionSchema, nominaSchema } from "./validation-nomina.js";

function cadenaNula(value: unknown): string | null {
  if (value == null || value === "") return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

export const dirigenteSchema = Yup.object({
  nombre: Yup.string().trim().required("El nombre es obligatorio"),
  primerApellido: Yup.string().trim().required("El primer apellido es obligatorio"),
  segundoApellido: Yup.string().trim().nullable(),
  fechaNacimiento: Yup.string()
    .required("La fecha de nacimiento es obligatoria")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  telefonoCelular: Yup.string()
    .trim()
    .matches(/^\d{10}$/, "El celular debe tener 10 dígitos")
    .required("El celular es obligatorio"),
  correo: Yup.string()
    .trim()
    .email("Correo electrónico inválido")
    .required("El correo es obligatorio"),
  fotoUrl: Yup.string().nullable(),

  tipo: Yup.string()
    .oneOf([...TIPOS_DIRIGENTE], "Tipo de dirigente inválido")
    .required("El tipo de dirigente es obligatorio"),
  seccionElectoral: Yup.string()
    .required("La sección electoral es obligatoria")
    .test(
      "seccion-valida",
      "Selecciona una sección electoral de Coyoacán",
      (v) => Boolean(v && esSeccionValida(v)),
    ),

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
  numeroExterior: Yup.string().trim().required("El número exterior es obligatorio"),
  numeroInterior: Yup.string().trim().nullable(),
  codigoPostal: Yup.string()
    .oneOf([...CODIGOS_POSTALES_COYOACAN], "Selecciona un código postal de Coyoacán")
    .required("El código postal es obligatorio"),

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
