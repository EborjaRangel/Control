export type DirigenteSeccionResumen = {
  id: string;
  nombreCompleto: string;
  tipo: string;
  colonia: string | null;
};

export type SeccionCoberturaMapa = {
  asignada: boolean;
  cantidad: number;
  nombres: string;
  colonias: string;
  dirigentes: DirigenteSeccionResumen[];
};

export type CoberturaSeccionesResponse = {
  totalSecciones: number;
  resumen: {
    asignadas: number;
    sinAsignar: number;
    totalDirigentes: number;
  };
  porSeccion: Record<string, SeccionCoberturaMapa>;
};
