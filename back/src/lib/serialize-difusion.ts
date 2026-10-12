import { nombreCompleto } from "./dirigentes.js";
import { campanaAceptaRegistros, etiquetaEstadoCampana } from "./campana-difusion.js";

export const dirigenteResumenDifusionSelect = {
  id: true,
  nombre: true,
  primerApellido: true,
  segundoApellido: true,
  tipo: true,
  seccionElectoral: true,
  colonia: true,
  activo: true,
} as const;

type CampanaRow = {
  id: string;
  titulo: string;
  fechaInicio: Date;
  fechaFin: Date;
  estado: "ACTIVA" | "CERRADA";
  cerradaAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { registros: number };
};

type RegistroRow = {
  id: string;
  campanaId: string;
  dirigenteId: string;
  fotoUrl: string;
  lat: number;
  lng: number;
  registradoAt: Date;
  campana?: CampanaRow;
  dirigente?: {
    id: string;
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
    tipo: string;
    seccionElectoral: string;
  };
};

function fechaIso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function serializeCampanaDifusion(c: CampanaRow) {
  return {
    id: c.id,
    titulo: c.titulo,
    fechaInicio: fechaIso(c.fechaInicio),
    fechaFin: fechaIso(c.fechaFin),
    estado: c.estado,
    estadoLabel: etiquetaEstadoCampana(c.estado),
    aceptaRegistros: campanaAceptaRegistros(c),
    cerradaAt: c.cerradaAt?.toISOString() ?? null,
    totalRegistros: c._count?.registros ?? undefined,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

export function serializeRegistroDifusion(r: RegistroRow) {
  return {
    id: r.id,
    campanaId: r.campanaId,
    campanaTitulo: r.campana?.titulo ?? null,
    dirigenteId: r.dirigenteId,
    dirigenteNombre: r.dirigente ? nombreCompleto(r.dirigente) : null,
    dirigenteTipo: r.dirigente?.tipo ?? null,
    dirigenteSeccion: r.dirigente?.seccionElectoral ?? null,
    fotoUrl: r.fotoUrl,
    lat: r.lat,
    lng: r.lng,
    registradoAt: r.registradoAt.toISOString(),
  };
}

export function serializeDirigenteDifusionPanel(
  dirigente: {
    id: string;
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
    tipo: string;
    seccionElectoral: string;
    colonia: string;
    activo: boolean;
  },
  totalRegistros: number,
) {
  return {
    dirigente: {
      id: dirigente.id,
      nombreCompleto: nombreCompleto(dirigente),
      tipo: dirigente.tipo,
      seccionElectoral: dirigente.seccionElectoral,
      colonia: dirigente.colonia,
      activo: dirigente.activo,
    },
    totalRegistros,
  };
}
