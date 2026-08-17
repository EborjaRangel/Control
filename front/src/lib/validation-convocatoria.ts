import * as Yup from "yup";

export const convocatoriaEventoSchema = Yup.object({
  mensaje: Yup.string()
    .trim()
    .required("El mensaje de convocatoria es obligatorio")
    .min(10, "El mensaje debe tener al menos 10 caracteres")
    .max(1000, "El mensaje no puede exceder 1000 caracteres"),
  telefonoPrueba: Yup.string()
    .trim()
    .matches(/^(\d{10})?$/, "El celular debe tener 10 dígitos")
    .optional(),
});

export type ConvocatoriaFormValues = Yup.InferType<typeof convocatoriaEventoSchema>;
