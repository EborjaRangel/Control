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

export type ColoniaSeccionDetalle = {
  nombre: string;
  porcentajeEstimado: number;
  electoresEstimados: number;
  utClave?: string | null;
  utNombre?: string | null;
};

export type ColoniasSeccionInfo = {
  compartida: boolean;
  colonias: ColoniaSeccionDetalle[];
  metodoEstimacion: "dirigentes" | "unidad_territorial" | "ut_catalogo" | "partes_iguales";
  etiquetaMetodo: string;
  etiquetaLista: string;
};

export type AnalisisSeccionRow = {
  seccion: string;
  dirigentes: string;
  casillas: string;
  totalCasillas: number;
  basicas: number;
  contiguas: number;
  unidadesTerritoriales: string;
  colonias: string;
  coloniasDetalle: ColoniasSeccionInfo;
  totalElectores: number;
  distritoLocal: number | null;
  distritoFederal: number | null;
  alcalde2015: ResultadoAlcaldiaSeccion | null;
  alcalde2018: ResultadoAlcaldiaSeccion | null;
  alcalde2021: ResultadoAlcaldiaSeccion | null;
  alcalde2024: ResultadoAlcaldiaSeccion | null;
};

export type AnalisisSeccionesResponse = {
  vigencia: string | null;
  fuente: string | null;
  totalSecciones: number;
  resultadosAlcaldiaAnios: number[];
  filas: AnalisisSeccionRow[];
};

export function formatElectores(n: number): string {
  return n.toLocaleString("es-MX");
}

export function formatPorcentaje(n: number): string {
  return `${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}
