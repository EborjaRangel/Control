import * as Yup from "yup";

/** DD/MM/AAAA — día y mes con 2 dígitos, año con 4. */
export const FECHA_NACIMIENTO_REGEX =
  /^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

export const FECHA_NACIMIENTO_MENSAJE =
  "Usa el formato DD/MM/AAAA (ej. 05/08/1985)";

export function esFechaNacimientoValida(value: string): boolean {
  if (!FECHA_NACIMIENTO_REGEX.test(value)) return false;
  const [dia, mes, anio] = value.split("/").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return (
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia
  );
}

export function esFechaIsoValida(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [anio, mes, dia] = value.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return (
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia
  );
}

export function fechaNacimientoToIso(value: string): string {
  const [dia, mes, anio] = value.split("/");
  return `${anio}-${mes}-${dia}`;
}

export function fechaNacimientoFromIso(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split("-");
  if (!anio || !mes || !dia) return iso;
  return `${dia}/${mes}/${anio}`;
}

/** Inserta barras mientras el usuario escribe (máx. 8 dígitos). */
export function formatearFechaNacimientoEnVivo(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function normalizarFechaNacimientoParaIso(value: unknown): string {
  if (value == null) return "";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (FECHA_NACIMIENTO_REGEX.test(s) && esFechaNacimientoValida(s)) {
    return fechaNacimientoToIso(s);
  }
  return s;
}

export const fechaNacimientoSchema = Yup.string()
  .required("La fecha de nacimiento es obligatoria")
  .matches(FECHA_NACIMIENTO_REGEX, FECHA_NACIMIENTO_MENSAJE)
  .test("fecha-valida", "La fecha no es válida", (v) =>
    Boolean(v && esFechaNacimientoValida(v)),
  );
