import * as Yup from "yup";

export const MAX_FOTOS_TRANSPORTE = 5;

const telefono10 = Yup.string()
  .trim()
  .required("Teléfono del chofer requerido")
  .matches(/^\d{10}$/, "El teléfono debe tener 10 dígitos");

export const registroTransporteCreateSchema = Yup.object({
  eventoId: Yup.string().trim().required("Selecciona el evento"),
  tipoUnidad: Yup.string()
    .oneOf(["CAMION", "MICROBUS"], "Tipo de transporte inválido")
    .required("Selecciona el tipo de transporte"),
  placas: Yup.string().trim().required("Placas requeridas").max(20),
  nombreChofer: Yup.string().trim().required("Nombre del chofer requerido").max(120),
  telefonoChofer: telefono10,
  tipoRecorrido: Yup.string()
    .oneOf(["IDA", "VUELTA", "IDA_Y_VUELTA"], "Tipo de recorrido inválido")
    .required("Selecciona el tipo de recorrido"),
  puntoEntrega: Yup.string().trim().required("Punto de entrega requerido").max(200),
  lat: Yup.number().required("Ubicación requerida").min(-90).max(90),
  lng: Yup.number().required("Ubicación requerida").min(-180).max(180),
  fotos: Yup.array()
    .of(Yup.string().trim().required())
    .min(1, "Sube al menos una foto de la unidad")
    .max(MAX_FOTOS_TRANSPORTE, `Máximo ${MAX_FOTOS_TRANSPORTE} fotografías`)
    .required(),
});
