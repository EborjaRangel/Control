export type AnalisisSeccionRow = {
  seccion: string;
  casillas: string;
  totalCasillas: number;
  basicas: number;
  contiguas: number;
  unidadesTerritoriales: string;
  colonias: string;
  totalElectores: number;
  distritoLocal: number | null;
  distritoFederal: number | null;
};

export type AnalisisSeccionesResponse = {
  vigencia: string | null;
  fuente: string | null;
  totalSecciones: number;
  filas: AnalisisSeccionRow[];
};

export function formatElectores(n: number): string {
  return n.toLocaleString("es-MX");
}
