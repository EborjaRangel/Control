import * as Yup from "yup";

export const campanaDifusionCreateSchema = Yup.object({
  titulo: Yup.string().trim().required("El título es obligatorio"),
  fechaInicio: Yup.string()
    .required("La fecha de inicio es obligatoria")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  fechaFin: Yup.string()
    .required("La fecha de término es obligatoria")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .test("fin-despues-inicio", "La fecha de término debe ser posterior o igual al inicio", function (fin) {
      const inicio = this.parent.fechaInicio as string | undefined;
      if (!inicio || !fin) return true;
      return fin >= inicio;
    }),
});

export const campanaDifusionUpdateSchema = campanaDifusionCreateSchema;

export const registroDifusionCreateSchema = Yup.object({
  campanaId: Yup.string().trim().required("Selecciona la campaña"),
  fotoUrl: Yup.string().trim().required("La fotografía es obligatoria"),
  lat: Yup.number().required("Ubica el punto en el mapa").min(-90).max(90),
  lng: Yup.number().required("Ubica el punto en el mapa").min(-180).max(180),
});

export const registroDifusionUpdateSchema = Yup.object({
  fotoUrl: Yup.string().trim().required("La fotografía es obligatoria"),
  lat: Yup.number().required("Ubica el punto en el mapa").min(-90).max(90),
  lng: Yup.number().required("Ubica el punto en el mapa").min(-180).max(180),
});
