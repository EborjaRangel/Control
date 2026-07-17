export type CasillaElectoralDTO = {
  id: string;
  seccion: string;
  numero: number;
  tipo: "BASICA" | "CONTIGUA";
  tipoLabel: string;
  extContigua: number | null;
  listaNominal: number;
  distritoFederal: number;
};

export type SeccionCasillasResumenDTO = {
  seccion: string;
  basicas: number;
  contiguas: number;
  total: number;
  casillas?: CasillaElectoralDTO[];
};

export type CasillasCatalogoResponse = {
  vigencia: string;
  fuente: string;
  urlFuente: string;
  totalCasillas: number;
  totalSecciones: number;
  porSeccion: Record<string, SeccionCasillasResumenDTO>;
};
