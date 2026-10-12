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

const ubicacionLat = Yup.number()
  .nullable()
  .typeError("Falta capturar la ubicación en el mapa")
  .required("Falta capturar la ubicación en el mapa")
  .test("ubicado", "Falta capturar la ubicación en el mapa", (v) => v != null && Math.abs(v) > 0.0001);

const ubicacionLng = Yup.number()
  .nullable()
  .typeError("Falta capturar la ubicación en el mapa")
  .required("Falta capturar la ubicación en el mapa")
  .test("ubicado", "Falta capturar la ubicación en el mapa", (v) => v != null && Math.abs(v) > 0.0001);

export const registroDifusionFormSchema = Yup.object({
  campanaId: Yup.string().trim().required("Selecciona la campaña"),
  fotoUrl: Yup.string().trim().required("Falta capturar la fotografía del evento"),
  lat: ubicacionLat,
  lng: ubicacionLng,
  direccion: Yup.string()
    .trim()
    .required("Falta capturar la dirección (marca el punto en el mapa)"),
});

export const registroDifusionEditFormSchema = registroDifusionFormSchema.omit(["campanaId"]);

export type RegistroDifusionFormValues = {
  campanaId: string;
  fotoUrl: string;
  lat: number | null;
  lng: number | null;
  direccion: string;
};

export function resumenCamposFaltantesRegistroDifusion(
  errors: Partial<Record<keyof RegistroDifusionFormValues, string>>,
): string | null {
  const faltantes: string[] = [];
  if (errors.fotoUrl) faltantes.push("fotografía del evento");
  if (errors.direccion || errors.lat || errors.lng) faltantes.push("dirección / ubicación en el mapa");
  if (errors.campanaId) faltantes.push("campaña");
  if (!faltantes.length) return null;
  return `Falta capturar: ${faltantes.join(" y ")}.`;
}
