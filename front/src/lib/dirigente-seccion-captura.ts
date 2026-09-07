export function dirigenteCapturaSoloSuSeccion(tipo: string | null | undefined): boolean {
  return Boolean(tipo && tipo !== "D1");
}
