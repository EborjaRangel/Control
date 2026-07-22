import * as Yup from "yup";

const TIPOS = [
  "FUGA_AGUA",
  "BACHE",
  "DESASOLVE_COLADERA",
  "PODA_ARBOL",
  "LUMINARIAS_FUNDIDAS",
] as const;

const ESTATUS = ["ENVIADO", "RECIBIDO", "ATENDIDO", "DESECHADO"] as const;

export const servicioUrbanoCreateSchema = Yup.object({
  dirigenteId: Yup.string().trim().required("Dirigente requerido"),
  tipo: Yup.string()
    .oneOf([...TIPOS], "Tipo de servicio inválido")
    .required("Selecciona el tipo de servicio"),
  descripcion: Yup.string().trim().max(2000, "Máximo 2000 caracteres").nullable(),
  direccion: Yup.string().trim().required("Marca la ubicación en el mapa"),
  lat: Yup.number()
    .typeError("Latitud inválida")
    .min(-90, "Latitud inválida")
    .max(90, "Latitud inválida")
    .required("Marca la ubicación en el mapa"),
  lng: Yup.number()
    .typeError("Longitud inválida")
    .min(-180, "Longitud inválida")
    .max(180, "Longitud inválida")
    .required("Marca la ubicación en el mapa"),
  fotoAntesUrl: Yup.string().trim().required("Sube la foto del antes"),
  fotoDespuesUrl: Yup.string().trim().required("Sube la foto del después"),
});

export const servicioUrbanoUpdateSchema = servicioUrbanoCreateSchema.omit(["dirigenteId"]);

export const servicioUrbanoEstatusSchema = Yup.object({
  estatus: Yup.string()
    .oneOf([...ESTATUS], "Estatus inválido")
    .required("Selecciona un estatus"),
  fotoAtencionUrl: Yup.string()
    .trim()
    .when("estatus", {
      is: "ATENDIDO",
      then: (schema) => schema.required("Sube la foto de cómo quedó el servicio"),
      otherwise: (schema) => schema.nullable().optional(),
    }),
  anotacionAtencion: Yup.string()
    .trim()
    .max(2000, "Máximo 2000 caracteres")
    .nullable()
    .optional(),
});
