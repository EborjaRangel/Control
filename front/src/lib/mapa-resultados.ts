export type GanadorMapaDTO = {
  clave: string;
  etiqueta: string;
  color: string;
  votos: number;
  porcentaje: number;
};

export type SeccionMapaResultadosDTO = {
  partido: GanadorMapaDTO;
  coalicion: GanadorMapaDTO;
  votacionTotal: number;
  participacionPct: number;
};

export type LeyendaMapaDTO = {
  clave: string;
  etiqueta: string;
  color: string;
  secciones?: number;
};

export type AnioMapaResultadosDTO = {
  anio: 2015 | 2018 | 2021 | 2024;
  etiqueta: string;
  notaPartido: string | null;
  notaCoalicion?: string | null;
  porSeccion: Record<string, SeccionMapaResultadosDTO>;
  resumenPartido: Record<string, number>;
  resumenCoalicion: Record<string, number>;
  leyendaPartido?: LeyendaMapaDTO[];
  leyendaCoalicion?: LeyendaMapaDTO[];
};

export type MapaResultadosResponse = {
  disponible: boolean;
  anios: Array<2015 | 2018 | 2021 | 2024>;
  leyendaPartido: LeyendaMapaDTO[];
  leyendaCoalicion: LeyendaMapaDTO[];
  porAnio: Record<string, AnioMapaResultadosDTO>;
};
