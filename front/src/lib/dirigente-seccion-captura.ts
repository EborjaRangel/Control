import { esSeccionValida } from "./secciones-electorales";

export function dirigenteCapturaSoloSuSeccion(tipo: string | null | undefined): boolean {
  return Boolean(tipo && tipo !== "D1");
}

export function detectadoSeccionPermitidaParaDirigente(
  _tipoDirigente: string | null | undefined,
  _seccionDirigente: string | null | undefined,
  seccionDetectado: string,
): boolean {
  return esSeccionValida(seccionDetectado);
}
