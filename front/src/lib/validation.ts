import * as Yup from "yup";
import { TIPOS_DIRIGENTE, tipoPermiteSeccionCero } from "./dirigentes";
import { CONCEPTOS_SUELDO_CATALOGO, MAX_CONCEPTOS_COMPOSICION, TIPOS_DETALLE_SUELDO } from "./composicion-sueldo";
import { COLONIAS_COYOACAN, coloniaCoincideConCp, CODIGOS_POSTALES_COYOACAN, esColoniaValida } from "./colonias";
import { esSeccionValidaParaDirigente } from "./secciones-electorales";
import { credencialesCreateSchema, credencialesUpdateSchema } from "./auth";
import { fechaNacimientoSchema } from "./fecha-nacimiento";
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
      const cleaned =
        typeof originalValue === "string"
          ? originalValue.replace(/[^\d.]/g, "")
          : originalValue;
      const n = Number(cleaned);
      if (Number.isNaN(n)) return originalValue;
      // Evita ceros a la derecha en el valor numérico (100.50 → 100.5).
      return Number(String(n));
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
  tipoDetalle: Yup.string()
    .oneOf([...TIPOS_DETALLE_SUELDO], "Selecciona Titular o Chambelán")
    .required("Selecciona Titular o Chambelán"),
});

export const nominaSchema = Yup.object({
  conceptosComposicion: Yup.array()
    .of(conceptoComposicionSchema)
    .max(MAX_CONCEPTOS_COMPOSICION, `Máximo ${MAX_CONCEPTOS_COMPOSICION} conceptos`)
    .default([]),
});

export type NominaFormValues = Yup.InferType<typeof nominaSchema>;

export const dirigenteSchema = Yup.object({
  tipo: Yup.string()
    .oneOf([...TIPOS_DIRIGENTE], "Tipo de dirigente inválido")
    .required("El tipo de dirigente es obligatorio"),

  nombre: Yup.string().trim().required("El nombre es obligatorio"),
  primerApellido: Yup.string().trim().required("El primer apellido es obligatorio"),
  segundoApellido: Yup.string().trim().nullable(),
  fechaNacimiento: fechaNacimientoSchema,
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
    .email("Correo electr?nico inv?lido")
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
