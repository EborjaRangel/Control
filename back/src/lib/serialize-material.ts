import type {
  AsignacionMaterialEntrega,
  EventoEntregaMaterial,
  RegistroEntregaMaterial,
  RegistroEntregaMaterialLinea,
} from "../generated/prisma/client.js";
import { nombreCompleto } from "./dirigentes.js";
import { etiquetaEstadoEntregaMaterial, vigenciaEntregaMaterialActiva } from "./material-entrega.js";

type DirigenteMini = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  distritoLocal: number | null;
};

type EventoRow = EventoEntregaMaterial & {
  _count?: { participantes: number; entregas: number };
};

export function serializeEventoEntregaMaterial(e: EventoRow) {
  const vigente = vigenciaEntregaMaterialActiva(e.fechaInicio, e.fechaFin);
  return {
    id: e.id,
    titulo: e.titulo,
    fechaInicio: e.fechaInicio.toISOString().slice(0, 10),
    fechaFin: e.fechaFin.toISOString().slice(0, 10),
    estado: e.estado,
    estadoLabel: etiquetaEstadoEntregaMaterial(e.estado),
    vigente,
    abiertoAt: e.abiertoAt?.toISOString() ?? null,
    cerradoAt: e.cerradoAt?.toISOString() ?? null,
    totalParticipantes: e._count?.participantes ?? undefined,
    totalEntregas: e._count?.entregas ?? undefined,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function serializeLineaMaterial(l: Pick<AsignacionMaterialEntrega, "descripcion" | "fotoUrl" | "cantidad">) {
  return {
    descripcion: l.descripcion,
    fotoUrl: l.fotoUrl,
    cantidad: l.cantidad,
  };
}

export function serializeRegistroEntregaMaterial(
  r: RegistroEntregaMaterial & {
    evento?: Pick<EventoEntregaMaterial, "id" | "titulo" | "fechaInicio" | "fechaFin"> | null;
    dirigente?: DirigenteMini | null;
    lineas?: RegistroEntregaMaterialLinea[];
    registradoPor?: { id: string; username: string } | null;
  },
) {
  return {
    id: r.id,
    eventoId: r.eventoId,
    eventoTitulo: r.evento?.titulo ?? null,
    eventoFechaInicio: r.evento?.fechaInicio.toISOString().slice(0, 10) ?? null,
    eventoFechaFin: r.evento?.fechaFin.toISOString().slice(0, 10) ?? null,
    dirigenteId: r.dirigenteId,
    dirigenteNombre: r.dirigente ? nombreCompleto(r.dirigente) : null,
    dirigenteTipo: r.dirigente?.tipo ?? null,
    dirigenteColonia: r.dirigente?.colonia ?? null,
    dirigenteSeccion: r.dirigente?.seccionElectoral ?? null,
    dirigenteDistritoLocal: r.dirigente?.distritoLocal ?? null,
    registradoAt: r.registradoAt.toISOString(),
    registradoPor: r.registradoPor ? { id: r.registradoPor.id, username: r.registradoPor.username } : null,
    lineas: (r.lineas ?? []).map(serializeLineaMaterial),
  };
}
