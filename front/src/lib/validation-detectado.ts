import * as Yup from "yup";
import { COLONIAS_COYOACAN, coloniaCoincideConCp, CODIGOS_POSTALES_COYOACAN } from "./colonias";
import { SECCIONES_ELECTORALES_COYOACAN } from "./secciones-electorales";

const coloniaNombres = COLONIAS_COYOACAN.map((c) => c.nombre);

export const detectadoBaseSchema = Yup.object({
  nombre: Yup.string().trim().required("El nombre es obligatorio"),
  primerApellido: Yup.string().trim().required("El primer apellido es obligatorio"),
  segundoApellido: Yup.string().trim().nullable(),
  telefonoCelular: Yup.string()
    .trim()
    .matches(/^\d{10}$/, "El celular debe tener 10 dígitos")
    .nullable(),
  seccionElectoral: Yup.string()
    .oneOf([...SECCIONES_ELECTORALES_COYOACAN], "Selecciona una sección electoral de Coyoacán")
    .required("La sección electoral es obligatoria"),
  ineFrenteUrl: Yup.string().trim().required("Sube la foto del anverso de la credencial"),
  ineReversoUrl: Yup.string().trim().required("Sube la foto del reverso de la credencial"),
});

export const detectadoCreateSchema = detectadoBaseSchema;
export const detectadoUpdateSchema = detectadoBaseSchema;

export const personaDetectadaSchema = Yup.object({
  nombre: Yup.string().trim().required("El nombre es obligatorio"),
  primerApellido: Yup.string().trim().required("El primer apellido es obligatorio"),
  segundoApellido: Yup.string().trim().nullable(),
  fechaNacimiento: Yup.string()
    .required("La fecha de nacimiento es obligatoria")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  sexo: Yup.string().oneOf(["H", "M", ""], "Sexo inválido").nullable(),
  claveElector: Yup.string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .matches(/^[A-Z0-9]{18}$/, "Clave de elector: 18 caracteres alfanuméricos"),
  curp: Yup.string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .matches(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/, "CURP inválida"),
  seccionElectoral: Yup.string()
    .oneOf([...SECCIONES_ELECTORALES_COYOACAN], "Sección electoral inválida")
    .required("La sección electoral es obligatoria"),
  colonia: Yup.string()
    .oneOf(coloniaNombres, "Selecciona una colonia de Coyoacán")
    .required("La colonia es obligatoria")
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
  ineFrenteUrl: Yup.string().trim().required("Sube la foto del anverso de la credencial"),
  ineReversoUrl: Yup.string().trim().required("Sube la foto del reverso de la credencial"),
});

export type DetectadoFormValues = Yup.InferType<typeof detectadoBaseSchema>;

export type PersonaDetectadaFormValues = Yup.InferType<typeof personaDetectadaSchema>;
