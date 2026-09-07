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
  suac: string;
  referencia: string;
  direccion: string;
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
  suac: Yup.string().trim().max(100, "Máximo 100 caracteres"),
  referencia: Yup.string().trim().max(500, "Máximo 500 caracteres"),
  direccion: Yup.string().trim().required("Escribe o corrige la dirección"),
  lat: Yup.number()
    .nullable()
    .typeError("Marca la ubicación en el mapa")
    .min(-90, "Latitud inválida")
    .max(90, "Latitud inválida")
    .required("Marca la ubicación en el mapa"),
  lng: Yup.number()
    .nullable()
    .typeError("Marca la ubicación en el mapa")
    .min(-180, "Longitud inválida")
    .max(180, "Longitud inválida")
    .required("Marca la ubicación en el mapa"),
  fotoAntesUrl: Yup.string().trim().required("Sube la foto del antes 1"),
  fotoDespuesUrl: Yup.string().trim().required("Sube la foto del antes 2"),
});
