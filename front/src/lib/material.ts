import type { EstadoEvento } from "@/lib/asistencia";

export type EventoEntregaMaterialDTO = {
  id: string;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoEvento;
  estadoLabel: string;
  vigente: boolean;
  abiertoAt: string | null;
  cerradoAt: string | null;
  totalParticipantes?: number;
  totalEntregas?: number;
  createdAt: string;
  updatedAt: string;
};

export type LineaMaterialDTO = {
  descripcion: string;
  fotoUrl: string;
  cantidad: number;
};

export type RegistroEntregaMaterialDTO = {
  id: string;
  eventoId: string;
  eventoTitulo: string | null;
  eventoFechaInicio: string | null;
  eventoFechaFin: string | null;
  dirigenteId: string;
  dirigenteNombre: string | null;
  dirigenteTipo: string | null;
  dirigenteColonia: string | null;
  dirigenteSeccion: string | null;
  dirigenteDistritoLocal: number | null;
  registradoAt: string;
  registradoPor: { id: string; username: string } | null;
  lineas: LineaMaterialDTO[];
};

export type PaseEntregaMaterialItem = {
  id: string;
  nombreCompleto: string;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  distritoLocal: number | null;
  distritoLabel: string;
  codigoQr: string;
  entregado: boolean;
  registradoAt: string | null;
  registradoPor: { id: string; username: string } | null;
  materialesAsignados: LineaMaterialDTO[];
};

export type ResumenDistritoEntrega = {
  distrito: number | "otros";
  distritoLabel: string;
  entregados: number;
  pendientes: number;
  entregadosLista: PaseEntregaMaterialItem[];
  pendientesLista: PaseEntregaMaterialItem[];
};

export type PaseEntregaMaterialResponse = {
  evento: EventoEntregaMaterialDTO;
  lista: PaseEntregaMaterialItem[];
  resumenDistritos: ResumenDistritoEntrega[];
  registros: RegistroEntregaMaterialDTO[];
};

export const ESTADO_ENTREGA_LABEL: Record<EstadoEvento, string> = {
  PROGRAMADO: "Programado",
  ABIERTO: "Entrega abierta",
  CERRADO: "Cerrado",
};

export function badgeEstadoEntrega(estado: EstadoEvento): string {
  if (estado === "ABIERTO") return "badge-pin";
  if (estado === "CERRADO") return "badge-muted";
  return "badge-secondary";
}

export function formatFechaMaterial(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatFechaHoraMaterial(iso: string): string {
  const dt = new Date(iso);
  return dt.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
