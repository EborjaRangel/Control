import type { AsambleaFormValues } from "./validation-asambleas";

export type AsambleaFotoDTO = {
  id: string;
  url: string;
  orden: number;
};

export type AsambleaDTO = {
  id: string;
  dirigenteId: string;
  fecha: string;
  hora: string;
  lugar: string;
  lat: number;
  lng: number;
  seccionElectoral: string;
  cantidadConvocada: number;
  cantidadReal: number;
  observacion: string | null;
  activo: boolean;
  fotos: AsambleaFotoDTO[];
  dirigente?: {
    id: string;
    nombreCompleto: string;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    activo: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type DirigenteAsambleasDTO = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  activo: boolean;
  asambleasActivas: number;
};

export type DirigenteAsambleasPanelDTO = {
  dirigente: DirigenteAsambleasDTO;
  asambleas: AsambleaDTO[];
};

export const EMPTY_ASAMBLEA: AsambleaFormValues = {
  fecha: "",
  hora: "",
  lugar: "",
  lat: 0,
  lng: 0,
  seccionElectoral: "",
  cantidadConvocada: 0,
  cantidadReal: 0,
  fotos: [],
};

export function asambleaToFormValues(a: AsambleaDTO): AsambleaFormValues {
  return {
    fecha: a.fecha,
    hora: a.hora,
    lugar: a.lugar,
    lat: a.lat,
    lng: a.lng,
    seccionElectoral: a.seccionElectoral,
    cantidadConvocada: a.cantidadConvocada,
    cantidadReal: a.cantidadReal,
    fotos: a.fotos.map((f) => f.url),
  };
}

export function formatAsambleaFecha(fecha: string, hora: string) {
  const [y, m, d] = fecha.split("-");
  if (!y || !m || !d) return `${fecha} ${hora}`;
  return `${d}/${m}/${y} · ${hora}`;
}
