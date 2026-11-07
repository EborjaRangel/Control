import * as Yup from "yup";

export const MAX_FOTOS_TRANSPORTE = 5;

const ubicacionLat = Yup.number()
  .nullable()
  .typeError("Falta la ubicación del dispositivo o del mapa")
  .required("Falta la ubicación del dispositivo o del mapa")
  .test("ubicado", "Falta la ubicación del dispositivo o del mapa", (v) => v != null && Math.abs(v) > 0.0001);

const ubicacionLng = Yup.number()
  .nullable()
  .typeError("Falta la ubicación del dispositivo o del mapa")
  .required("Falta la ubicación del dispositivo o del mapa")
  .test("ubicado", "Falta la ubicación del dispositivo o del mapa", (v) => v != null && Math.abs(v) > 0.0001);

const telefono10 = Yup.string()
  .trim()
  .required("Teléfono del chofer requerido")
  .matches(/^\d{10}$/, "El teléfono debe tener 10 dígitos");

export const registroTransporteFormSchema = Yup.object({
  direccionMapa: Yup.string().optional(),
  eventoId: Yup.string().trim().required("Selecciona el evento"),
  tipoUnidad: Yup.string()
    .oneOf(["CAMION", "MICROBUS"], "Selecciona el tipo de transporte")
    .required("Selecciona el tipo de transporte"),
  placas: Yup.string().trim().required("Placas requeridas").max(20),
  nombreChofer: Yup.string().trim().required("Nombre del chofer requerido").max(120),
  telefonoChofer: telefono10,
  tipoRecorrido: Yup.string()
    .oneOf(["IDA", "VUELTA", "IDA_Y_VUELTA"], "Selecciona el tipo de recorrido")
    .required("Selecciona el tipo de recorrido"),
  puntoEntrega: Yup.string().trim().required("Punto de entrega requerido").max(200),
  lat: ubicacionLat,
  lng: ubicacionLng,
  fotos: Yup.array()
    .of(Yup.string().trim().required())
    .min(1, "Sube al menos una foto de la unidad")
    .max(MAX_FOTOS_TRANSPORTE, `Máximo ${MAX_FOTOS_TRANSPORTE} fotografías`),
});

export type RegistroTransporteFormValues = {
  eventoId: string;
  tipoUnidad: "CAMION" | "MICROBUS";
  placas: string;
  nombreChofer: string;
  telefonoChofer: string;
  tipoRecorrido: "IDA" | "VUELTA" | "IDA_Y_VUELTA";
  puntoEntrega: string;
  direccionMapa?: string;
  lat: number | null;
  lng: number | null;
  fotos: string[];
};
