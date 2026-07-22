import * as Yup from "yup";

const TIPOS = [
  "FUGA_AGUA",
  "BACHE",
  "DESASOLVE_COLADERA",
  "PODA_ARBOL",
  "LUMINARIAS_FUNDIDAS",
] as const;

export const servicioUrbanoCreateSchema = Yup.object({
  dirigenteId: Yup.string().trim().required("Dirigente requerido"),
  tipo: Yup.string()
    .oneOf([...TIPOS], "Tipo de servicio inválido")
    .required("Selecciona el tipo de servicio"),
  descripcion: Yup.string().trim().max(2000, "Máximo 2000 caracteres").nullable(),
  lat: Yup.number()
    .typeError("Latitud inválida")
    .min(-90, "Latitud inválida")
    .max(90, "Latitud inválida")
    .required("Captura la ubicación GPS"),
  lng: Yup.number()
    .typeError("Longitud inválida")
    .min(-180, "Longitud inválida")
    .max(180, "Longitud inválida")
    .required("Captura la ubicación GPS"),
  fotoAntesUrl: Yup.string().trim().required("Sube la foto del antes"),
  fotoDespuesUrl: Yup.string().trim().required("Sube la foto del después"),
});

export const servicioUrbanoUpdateSchema = servicioUrbanoCreateSchema.omit(["dirigenteId"]);
