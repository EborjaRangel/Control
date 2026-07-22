import * as Yup from "yup";

const TIPOS = [
  "FUGA_AGUA",
  "BACHE",
  "DESASOLVE_COLADERA",
  "PODA_ARBOL",
  "LUMINARIAS_FUNDIDAS",
] as const;

export type ServicioUrbanoFormValues = {
  tipo: (typeof TIPOS)[number] | "";
  descripcion: string;
  lat: number | null;
  lng: number | null;
  fotoAntesUrl: string;
  fotoDespuesUrl: string;
};

export const servicioUrbanoFormSchema = Yup.object({
  tipo: Yup.string()
    .oneOf([...TIPOS], "Selecciona el tipo de servicio")
    .required("Selecciona el tipo de servicio"),
  descripcion: Yup.string().trim().max(2000, "Máximo 2000 caracteres"),
  lat: Yup.number()
    .nullable()
    .typeError("Captura la ubicación GPS")
    .min(-90, "Latitud inválida")
    .max(90, "Latitud inválida")
    .required("Captura la ubicación GPS"),
  lng: Yup.number()
    .nullable()
    .typeError("Captura la ubicación GPS")
    .min(-180, "Longitud inválida")
    .max(180, "Longitud inválida")
    .required("Captura la ubicación GPS"),
  fotoAntesUrl: Yup.string().trim().required("Sube la foto del antes"),
  fotoDespuesUrl: Yup.string().trim().required("Sube la foto del después"),
});
