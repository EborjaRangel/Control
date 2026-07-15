export type EstadoEvento = "PROGRAMADO" | "ABIERTO" | "CERRADO";
export type AlcanceEvento =
  | "COLONIA"
  | "SECCION"
  | "UNIDAD_TERRITORIAL"
  | "DISTRITO"
  | "TIPO_DIRIGENTE";

export type EventoAsistenciaDTO = {
  id: string;
  titulo: string;
  fecha: string;
  hora: string;
  lugar: string;
  alcance: AlcanceEvento;
  colonia: string | null;
  seccionElectoral: string | null;
  unidadTerritorial: {
    id: string;
    clave: string;
    nombre: string;
    tipoUt: string | null;
  } | null;
  distritoLocal: number | null;
  tipoDirigente: string | null;
  alcanceLabel: string;
  estado: EstadoEvento;
  abiertoAt: string | null;
  cerradoAt: string | null;
  totalAsistencias: number | null;
  totalElegibles?: number;
  totalFaltas?: number | null;
  createdAt: string;
  updatedAt: string;
};

export type DirigenteAsistenciaResumen = {
  id: string;
  nombreCompleto: string;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  eventosElegibles: number;
  asistencias: number;
  faltas: number;
};

export type PaseListaResponse = {
  evento: EventoAsistenciaDTO;
  lista: {
    id: string;
    nombreCompleto: string;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    codigoQr: string;
    asistio: boolean;
  }[];
  registros: {
    id: string;
    registradoAt: string;
    dirigente: {
      id: string;
      nombreCompleto: string;
      tipo: string;
      colonia: string;
      seccionElectoral: string;
    };
  }[];
};

export const ESTADO_EVENTO_LABEL: Record<EstadoEvento, string> = {
  PROGRAMADO: "Programado",
  ABIERTO: "Pase abierto",
  CERRADO: "Cerrado",
};

export type FiltroEventosLista = "activos" | "todos" | "cerrados";

export function eventoEstaActivo(estado: EstadoEvento): boolean {
  return estado === "PROGRAMADO" || estado === "ABIERTO";
}

export function filtrarEventosPorEstado<T extends { estado: EstadoEvento }>(
  eventos: T[],
  filtro: FiltroEventosLista,
): T[] {
  if (filtro === "activos") return eventos.filter((e) => eventoEstaActivo(e.estado));
  if (filtro === "cerrados") return eventos.filter((e) => e.estado === "CERRADO");
  return eventos;
}

export const ALCANCE_EVENTO_LABEL: Record<AlcanceEvento, string> = {
  COLONIA: "Por colonia",
  SECCION: "Por sección electoral",
  UNIDAD_TERRITORIAL: "Por unidad territorial",
  DISTRITO: "Por distrito local",
  TIPO_DIRIGENTE: "Por tipo de dirigente (D1–D4)",
};

export function badgeEstadoEvento(estado: EstadoEvento): string {
  switch (estado) {
    case "ABIERTO":
      return "badge-pin";
    case "CERRADO":
      return "badge-muted";
    default:
      return "badge-warning";
  }
}

export function formatFechaEvento(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export type EventoCreateForm = import("./validation-asistencia").EventoFormValues;

export { EMPTY_EVENTO } from "./validation-asistencia";
