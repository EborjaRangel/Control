export type PartidoVotosSeccion = {
  clave: string;
  etiqueta: string;
  votos: number;
  porcentaje: number;
};

export type ResultadoAlcaldiaSeccion = {
  listaNominal: number;
  votacionTotal: number;
  participacionPct: number;
  votosNulos: number;
  votosNulosPct: number;
  partidos: PartidoVotosSeccion[];
};

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
  alcalde2021: ResultadoAlcaldiaSeccion | null;
  alcalde2024: ResultadoAlcaldiaSeccion | null;
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

export function formatPorcentaje(n: number): string {
  return `${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
