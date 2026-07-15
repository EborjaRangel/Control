import * as Yup from "yup";

export const convocatoriaEventoSchema = Yup.object({
  mensaje: Yup.string()
    .trim()
    .required("El mensaje de convocatoria es obligatorio")
    .min(10, "El mensaje debe tener al menos 10 caracteres")
    .max(1000, "El mensaje no puede exceder 1000 caracteres"),
});

export type ConvocatoriaEventoInput = Yup.InferType<typeof convocatoriaEventoSchema>;
