/** Código único para cerrar eventos de asistencia (solo en servidor; no exponer en el front). */
export function codigoCierreEventoAsistencia(): string | null {
  const v = process.env.EVENTO_ASISTENCIA_CIERRE_CODIGO?.trim();
  return v || null;
}

export function validarCodigoCierreEventoAsistencia(codigo: unknown): boolean {
  const esperado = codigoCierreEventoAsistencia();
  if (!esperado) return false;
  if (typeof codigo !== "string") return false;
  return codigo.trim() === esperado;
}