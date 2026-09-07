export function dirigenteCapturaSoloSuSeccion(tipo: string | null | undefined): boolean {
  return Boolean(tipo && tipo !== "D1");
}

export function detectadoSeccionPermitidaParaDirigente(
  tipoDirigente: string | null | undefined,
  seccionDirigente: string | null | undefined,
  seccionDetectado: string,
): boolean {
  if (!tipoDirigente || !seccionDirigente) return true;
  if (!dirigenteCapturaSoloSuSeccion(tipoDirigente)) return true;
  return seccionDetectado === seccionDirigente;
}
