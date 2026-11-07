import type {
  EventoAsistencia,
  RegistroTransporte,
  RegistroTransporteFoto,
  TipoRecorridoTransporte,
  TipoTransporteUnidad,
} from "../generated/prisma/client.js";
import { nombreCompleto } from "./dirigentes.js";

export const TIPO_TRANSPORTE_LABEL: Record<TipoTransporteUnidad, string> = {
  CAMION: "Camión",
  MICROBUS: "Microbús",
  VAN: "Van",
};

export const TIPO_RECORRIDO_LABEL: Record<TipoRecorridoTransporte, string> = {
  IDA: "Ida",
  VUELTA: "Vuelta",
  IDA_Y_VUELTA: "Ida y vuelta",
};

export const dirigenteResumenTransporteSelect = {
  id: true,
  numeroFicha: true,
  nombre: true,
  primerApellido: true,
  segundoApellido: true,
  tipo: true,
  colonia: true,
  seccionElectoral: true,
  activo: true,
  status: true,
} as const;

type RegistroConRelaciones = RegistroTransporte & {
  evento: Pick<EventoAsistencia, "id" | "titulo" | "fecha" | "estado">;
  fotos: RegistroTransporteFoto[];
};

export function serializeEventoTransporteResumen(evento: Pick<EventoAsistencia, "id" | "titulo" | "fecha" | "estado">) {
  return {
    id: evento.id,
    titulo: evento.titulo,
    fecha: evento.fecha.toISOString().slice(0, 10),
    estado: evento.estado,
  };
}

export function serializeRegistroTransporte(r: RegistroConRelaciones) {
  return {
    id: r.id,
    eventoId: r.eventoId,
    eventoTitulo: r.evento.titulo,
    eventoFecha: r.evento.fecha.toISOString().slice(0, 10),
    tipoUnidad: r.tipoUnidad,
    tipoUnidadLabel: TIPO_TRANSPORTE_LABEL[r.tipoUnidad],
    placas: r.placas,
    nombreChofer: r.nombreChofer,
    telefonoChofer: r.telefonoChofer,
    tipoRecorrido: r.tipoRecorrido,
    tipoRecorridoLabel: TIPO_RECORRIDO_LABEL[r.tipoRecorrido],
    puntoEntrega: r.puntoEntrega,
    lat: r.lat,
    lng: r.lng,
    fotos: r.fotos
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((f) => ({ id: f.id, url: f.url, orden: f.orden })),
    registradoAt: r.registradoAt.toISOString(),
  };
}

type RegistroConDirigente = RegistroConRelaciones & {
  dirigente: {
    id: string;
    numeroFicha: number | null;
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
    colonia: string;
    seccionElectoral: string;
  };
};

export function serializeRegistroTransporteAdmin(r: RegistroConDirigente) {
  return {
    ...serializeRegistroTransporte(r),
    dirigenteId: r.dirigenteId,
    dirigenteNombre: nombreCompleto(r.dirigente),
    dirigenteNumeroFicha: r.dirigente.numeroFicha,
    dirigenteColonia: r.dirigente.colonia,
    dirigenteSeccion: r.dirigente.seccionElectoral,
  };
}

export function serializeDirigenteTransportePanel(
  dirigente: {
    id: string;
    numeroFicha: number | null;
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    activo: boolean;
    status: string;
  },
  totalRegistros: number,
) {
  return {
    dirigente: {
      id: dirigente.id,
      numeroFicha: dirigente.numeroFicha,
      nombreCompleto: nombreCompleto(dirigente),
      tipo: dirigente.tipo,
      colonia: dirigente.colonia,
      seccionElectoral: dirigente.seccionElectoral,
      activo: dirigente.activo,
      status: dirigente.status,
    },
    totalRegistros,
  };
}
