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
  fotoAtencionUrl: string | null;
  anotacionAtencion: string | null;
  atendidoAt: string | null;
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

export type SemaforoTiempoReporte = "verde" | "amarillo" | "rojo";

const MS_HORA = 1000 * 60 * 60;

export function calcSemaforoTiempoReporte(createdAt: string | Date): SemaforoTiempoReporte {
  const ms = Date.now() - new Date(createdAt).getTime();
  const horas = ms / MS_HORA;
  if (horas <= 24) return "verde";
  if (horas <= 96) return "amarillo";
  return "rojo";
}

export function horasDesdeReporte(createdAt: string | Date) {
  const ms = Math.max(0, Date.now() - new Date(createdAt).getTime());
  return ms / MS_HORA;
}

export function etiquetaSemaforoTiempoReporte(createdAt: string | Date) {
  const horas = horasDesdeReporte(createdAt);
  if (horas < 1) {
    const mins = Math.max(1, Math.round(horas * 60));
    return `${mins} min`;
  }
  if (horas < 48) {
    return `${Math.round(horas)} h`;
  }
  const dias = Math.round(horas / 24);
  return `${dias} d`;
}

export function semaforoBadgeClass(semaforo: SemaforoTiempoReporte) {
  switch (semaforo) {
    case "verde":
      return "bg-success-bg text-success-text ring-success-text/20";
    case "amarillo":
      return "bg-warning-bg text-warning-text ring-warning-text/20";
    default:
      return "bg-error-bg text-error-text ring-error-text/20";
  }
}

export function semaforoMarkerColor(semaforo: SemaforoTiempoReporte) {
  switch (semaforo) {
    case "verde":
      return "#2e7d32";
    case "amarillo":
      return "#f57c00";
    default:
      return "#c62828";
  }
}

export function semaforoDescripcion(semaforo: SemaforoTiempoReporte) {
  switch (semaforo) {
    case "verde":
      return "0–24 h";
    case "amarillo":
      return "24 h 1 min – 96 h";
    default:
      return "Más de 96 h";
  }
}

export type ServiciosUrbanosFiltros = {
  buscar?: string;
  tipo?: TipoServicioUrbano | "";
  estatus?: EstatusServicioUrbano | "";
  dirigenteId?: string;
  colonia?: string;
  seccionElectoral?: string;
  unidadTerritorialId?: string;
  distritoLocal?: string;
  distritoFederal?: string;
};

export function buildServiciosUrbanosQuery(filtros: ServiciosUrbanosFiltros) {
  const params = new URLSearchParams();
  if (filtros.buscar?.trim()) params.set("buscar", filtros.buscar.trim());
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.estatus) params.set("estatus", filtros.estatus);
  if (filtros.dirigenteId) params.set("dirigenteId", filtros.dirigenteId);
  if (filtros.colonia) params.set("colonia", filtros.colonia);
  if (filtros.seccionElectoral) params.set("seccionElectoral", filtros.seccionElectoral);
  if (filtros.unidadTerritorialId) params.set("unidadTerritorialId", filtros.unidadTerritorialId);
  if (filtros.distritoLocal) params.set("distritoLocal", filtros.distritoLocal);
  if (filtros.distritoFederal) params.set("distritoFederal", filtros.distritoFederal);
  return params.toString();
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
