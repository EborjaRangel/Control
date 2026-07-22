export type TipoServicioUrbano =
  | "FUGA_AGUA"
  | "BACHE"
  | "DESASOLVE_COLADERA"
  | "PODA_ARBOL"
  | "LUMINARIAS_FUNDIDAS";

export type EstatusServicioUrbano = "ENVIADO" | "RECIBIDO" | "ATENDIDO" | "DESECHADO";

export const TIPO_SERVICIO_URBANO_LABEL: Record<TipoServicioUrbano, string> = {
  FUGA_AGUA: "Fuga de agua",
  BACHE: "Bache",
  DESASOLVE_COLADERA: "Desazolve de coladera",
  PODA_ARBOL: "Poda de árbol",
  LUMINARIAS_FUNDIDAS: "Luminarias fundidas",
};

export const ESTATUS_SERVICIO_URBANO_LABEL: Record<EstatusServicioUrbano, string> = {
  ENVIADO: "Enviado",
  RECIBIDO: "Recibido",
  ATENDIDO: "Atendido",
  DESECHADO: "Desechado",
};

export const TIPOS_SERVICIO_URBANO = Object.entries(TIPO_SERVICIO_URBANO_LABEL).map(
  ([value, label]) => ({ value: value as TipoServicioUrbano, label }),
);

export const ESTATUS_SERVICIO_URBANO = Object.entries(ESTATUS_SERVICIO_URBANO_LABEL).map(
  ([value, label]) => ({ value: value as EstatusServicioUrbano, label }),
);

export type ReporteServicioUrbanoDTO = {
  id: string;
  folio: string;
  dirigenteId: string;
  tipo: TipoServicioUrbano;
  tipoLabel: string;
  descripcion: string | null;
  colonia: string | null;
  seccionElectoral: string | null;
  direccion: string;
  lat: number;
  lng: number;
  fotoAntesUrl: string;
  fotoDespuesUrl: string;
  estatus: EstatusServicioUrbano;
  estatusLabel: string;
  estatusAt: string;
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

export function estatusBadgeClass(estatus: EstatusServicioUrbano) {
  switch (estatus) {
    case "RECIBIDO":
      return "badge-warning";
    case "ATENDIDO":
      return "badge-notif";
    case "DESECHADO":
      return "badge-muted";
    default:
      return "badge-pin";
  }
}

export const EMPTY_SERVICIO_URBANO = {
  tipo: "" as TipoServicioUrbano | "",
  descripcion: "",
  direccion: "",
  lat: null as number | null,
  lng: null as number | null,
  fotoAntesUrl: "",
  fotoDespuesUrl: "",
};
