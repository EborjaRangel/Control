import * as Yup from "yup";
import { TIPOS_DIRIGENTE, tipoPermiteSeccionCero } from "./dirigentes.js";
import { COLONIAS_COYOACAN, coloniaCoincideConCp, CODIGOS_POSTALES_COYOACAN, esColoniaValida } from "./colonias.js";
import { esSeccionValidaParaDirigente } from "./secciones-electorales.js";
import { credencialesCreateSchema, credencialesUpdateSchema } from "./auth-validation.js";
import { fechaNacimientoApiSchema } from "./fecha-nacimiento.js";
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
  tipo: Yup.string()
    .oneOf([...TIPOS_DIRIGENTE], "Tipo de dirigente inválido")
    .required("El tipo de dirigente es obligatorio"),

  nombre: Yup.string().trim().required("El nombre es obligatorio"),
  primerApellido: Yup.string().trim().required("El primer apellido es obligatorio"),
  segundoApellido: Yup.string().trim().nullable(),
  fechaNacimiento: fechaNacimientoApiSchema,
  telefonoCelular: Yup.string()
    .trim()
    .test("celular-segun-tipo", "Revisa el celular", function (v) {
      const tipo = String((this.parent as { tipo?: string }).tipo ?? "");
      if (tipoPermiteSeccionCero(tipo)) {
        if (!v) return true;
        return /^\d{10}$/.test(v)
          ? true
          : this.createError({ message: "Si capturas celular, deben ser 10 dígitos" });
      }
      if (!v) return this.createError({ message: "El celular es obligatorio" });
      return /^\d{10}$/.test(v)
        ? true
        : this.createError({ message: "El celular debe tener 10 dígitos" });
    }),
  correo: Yup.string()
    .trim()
    .email("Correo electrónico inválido")
    .required("El correo es obligatorio"),
  fotoUrl: Yup.string().nullable(),

  seccionElectoral: Yup.string().test(
    "seccion-valida",
    "Selecciona una sección válida para este tipo",
    function (v) {
      const tipo = String((this.parent as { tipo?: string }).tipo ?? "");
      if (!tipo) return false;
      if (tipoPermiteSeccionCero(tipo)) {
        return v === "0" || (!!v && esSeccionValidaParaDirigente(tipo, v));
      }
      if (!v) return this.createError({ message: "La sección electoral es obligatoria" });
      return esSeccionValidaParaDirigente(tipo, v);
    },
  ),

  colonia: Yup.string()
    .test("colonia-valida", "Selecciona una colonia de Coyoacán", function (v) {
      const tipo = String((this.parent as { tipo?: string }).tipo ?? "");
      if (!v) {
        return tipoPermiteSeccionCero(tipo)
          ? true
          : this.createError({ message: "La colonia es obligatoria" });
      }
      return esColoniaValida(v);
    })
    .test(
      "colonia-coincide-cp",
      "La colonia no corresponde al código postal seleccionado",
      function (colonia) {
        const { codigoPostal } = this.parent as { codigoPostal?: string };
        if (!colonia || !codigoPostal) return true;
        return coloniaCoincideConCp(colonia, codigoPostal);
      },
    ),
  calle: Yup.string()
    .trim()
    .test("calle-segun-tipo", "La calle es obligatoria", function (v) {
      const tipo = String((this.parent as { tipo?: string }).tipo ?? "");
      if (tipoPermiteSeccionCero(tipo)) return true;
      return Boolean(v?.trim()) || this.createError({ message: "La calle es obligatoria" });
    }),
  numeroExterior: Yup.string()
    .trim()
    .test("num-ext-segun-tipo", "El número exterior es obligatorio", function (v) {
      const tipo = String((this.parent as { tipo?: string }).tipo ?? "");
      if (tipoPermiteSeccionCero(tipo)) return true;
      return Boolean(v?.trim()) || this.createError({ message: "El número exterior es obligatorio" });
    }),
  numeroInterior: Yup.string().trim().nullable(),
  codigoPostal: Yup.string().test("cp-segun-tipo", "Revisa el código postal", function (v) {
    const tipo = String((this.parent as { tipo?: string }).tipo ?? "");
    if (tipoPermiteSeccionCero(tipo)) {
      if (!v) return true;
      return (CODIGOS_POSTALES_COYOACAN as readonly string[]).includes(v)
        ? true
        : this.createError({ message: "Selecciona un código postal de Coyoacán" });
    }
    if (!v) return this.createError({ message: "El código postal es obligatorio" });
    return (CODIGOS_POSTALES_COYOACAN as readonly string[]).includes(v)
      ? true
      : this.createError({ message: "Selecciona un código postal de Coyoacán" });
  }),

  unidadTerritorialId: Yup.string().transform(cadenaNula).nullable(),
})
  .concat(dirigenteExtraSchema);

export const dirigenteCreateSchema = dirigenteSchema.concat(credencialesCreateSchema);
export const dirigenteUpdateSchema = dirigenteSchema.concat(credencialesUpdateSchema);

export type DirigenteFormValues = Yup.InferType<typeof dirigenteSchema> & {
  usuario: string;
  password?: string | null;
};
