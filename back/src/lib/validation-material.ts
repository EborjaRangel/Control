import * as Yup from "yup";

export const lineaMaterialSchema = Yup.object({
  descripcion: Yup.string().trim().required("La descripción del material es obligatoria"),
  fotoUrl: Yup.string().trim().required("La fotografía del material es obligatoria"),
  cantidad: Yup.number()
    .transform((value, original) => {
      if (original === "" || original == null) return undefined;
      const n = typeof original === "number" ? original : Number(original);
      return Number.isFinite(n) ? n : undefined;
    })
    .integer("La cantidad debe ser entera")
    .min(1, "La cantidad debe ser al menos 1")
    .required("Indica la cantidad"),
});

const participanteSchema = Yup.object({
  dirigenteId: Yup.string().trim().required("Dirigente requerido"),
  lineas: Yup.array().of(lineaMaterialSchema).min(1, "Agrega al menos un material por dirigente").required(),
});

/** Crear entrega: `lineasComunes` convoca a todos los dirigentes activos (flujo actual). */
export const eventoEntregaMaterialCreateSchema = Yup.object({
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
  todosDirigentesActivos: Yup.boolean().optional().default(true),
  lineasComunes: Yup.array()
    .of(lineaMaterialSchema)
    .min(1, "Agrega al menos un material")
    .required("Agrega al menos un material"),
  participantes: Yup.array().of(participanteSchema).optional(),
});
