import { nombreCompleto } from "./dirigentes.js";

type FotoRow = {
  id: string;
  url: string;
  orden: number;
};

type AsambleaRow = {
  id: string;
  dirigenteId: string;
  fecha: Date;
  hora: string;
  lugar: string;
  lat: number;
  lng: number;
  seccionElectoral: string;
  cantidadConvocada: number;
  cantidadReal: number;
  observacion: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  fotos?: FotoRow[];
  dirigente?: {
    id: string;
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    activo: boolean;
  } | null;
};

export const dirigenteResumenAsambleasSelect = {
  id: true,
  nombre: true,
  primerApellido: true,
  segundoApellido: true,
  tipo: true,
  colonia: true,
  seccionElectoral: true,
  activo: true,
} as const;

function serializeFoto(f: FotoRow) {
  return {
    id: f.id,
    url: f.url,
    orden: f.orden,
  };
}

export function serializeAsamblea(a: AsambleaRow) {
  const fotos = (a.fotos ?? []).slice().sort((x, y) => x.orden - y.orden).slice(0, 10);
  return {
    id: a.id,
    dirigenteId: a.dirigenteId,
    fecha: a.fecha.toISOString().slice(0, 10),
    hora: a.hora,
    lugar: a.lugar,
    lat: a.lat,
    lng: a.lng,
    seccionElectoral: a.seccionElectoral,
    cantidadConvocada: a.cantidadConvocada,
    cantidadReal: a.cantidadReal,
    observacion: a.observacion,
    activo: a.activo,
    fotos: fotos.map(serializeFoto),
    dirigente: a.dirigente
      ? {
          id: a.dirigente.id,
          nombreCompleto: nombreCompleto(a.dirigente),
          tipo: a.dirigente.tipo,
          colonia: a.dirigente.colonia,
          seccionElectoral: a.dirigente.seccionElectoral,
          activo: a.dirigente.activo,
        }
      : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export type AsambleaDTO = ReturnType<typeof serializeAsamblea>;

export function serializeDirigenteAsambleas(
  dirigente: {
    id: string;
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    activo: boolean;
  },
  asambleasActivas: number,
) {
  return {
    id: dirigente.id,
    nombre: dirigente.nombre,
    primerApellido: dirigente.primerApellido,
    segundoApellido: dirigente.segundoApellido,
    nombreCompleto: nombreCompleto(dirigente),
    tipo: dirigente.tipo,
    colonia: dirigente.colonia,
    seccionElectoral: dirigente.seccionElectoral,
    activo: dirigente.activo,
    asambleasActivas,
  };
}

export type DirigenteAsambleasDTO = ReturnType<typeof serializeDirigenteAsambleas>;
