export type TipoServicioUrbano =
  | "FUGA_AGUA"
  | "BACHE"
  | "DESASOLVE_COLADERA"
  | "PODA_ARBOL"
  | "LUMINARIAS_FUNDIDAS";

export const TIPO_SERVICIO_URBANO_LABEL: Record<TipoServicioUrbano, string> = {
  FUGA_AGUA: "Fuga de agua",
  BACHE: "Bache",
  DESASOLVE_COLADERA: "Desazolve de coladera",
  PODA_ARBOL: "Poda de árbol",
  LUMINARIAS_FUNDIDAS: "Luminarias fundidas",
};

export const TIPOS_SERVICIO_URBANO = Object.entries(TIPO_SERVICIO_URBANO_LABEL).map(
  ([value, label]) => ({ value: value as TipoServicioUrbano, label }),
);

export type ReporteServicioUrbanoDTO = {
  id: string;
  dirigenteId: string;
  tipo: TipoServicioUrbano;
  tipoLabel: string;
  descripcion: string | null;
  colonia: string | null;
  seccionElectoral: string | null;
  lat: number;
  lng: number;
  fotoAntesUrl: string;
  fotoDespuesUrl: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  dirigente: {
    id: string;
    nombreCompleto: string;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    activo: boolean;
  } | null;
};

export type DirigenteServiciosUrbanosDTO = {
  id: string;
  nombreCompleto: string;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  activo: boolean;
  reportesActivos: number;
};

export type DirigenteServiciosUrbanosPanelDTO = {
  dirigente: DirigenteServiciosUrbanosDTO;
  reportes: ReporteServicioUrbanoDTO[];
};

export function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function formatReporteFecha(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export const EMPTY_SERVICIO_URBANO = {
  tipo: "" as TipoServicioUrbano | "",
  descripcion: "",
  lat: null as number | null,
  lng: null as number | null,
  fotoAntesUrl: "",
  fotoDespuesUrl: "",
};
