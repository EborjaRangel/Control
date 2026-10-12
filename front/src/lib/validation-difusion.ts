import * as Yup from "yup";

export const campanaDifusionFormSchema = Yup.object({
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

export const registroDifusionFormSchema = Yup.object({
  campanaId: Yup.string().trim().required("Selecciona la campaña"),
  fotoUrl: Yup.string().trim().required("Sube la fotografía del evento"),
  lat: Yup.number()
    .nullable()
    .typeError("Marca la ubicación en el mapa")
    .required("Marca la ubicación en el mapa")
    .test("ubicado", "Marca la ubicación en el mapa", (v) => v != null && Math.abs(v) > 0.0001),
  lng: Yup.number()
    .nullable()
    .typeError("Marca la ubicación en el mapa")
    .required("Marca la ubicación en el mapa")
    .test("ubicado", "Marca la ubicación en el mapa", (v) => v != null && Math.abs(v) > 0.0001),
});
