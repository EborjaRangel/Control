import type { AsambleaAdminFormValues, AsambleaFormValues } from "./validation-asambleas";

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
  titulo: string;
  descripcion: string | null;
  calificacion: number | null;
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

export function asambleaToAdminFormValues(a: AsambleaDTO): AsambleaAdminFormValues {
  return {
    ...asambleaToFormValues(a),
    titulo: a.titulo,
    descripcion: a.descripcion ?? "",
    calificacion: a.calificacion ?? 3,
    observacion: a.observacion ?? "",
  };
}

export function formatAsambleaFecha(fecha: string, hora: string) {
  const [y, m, d] = fecha.split("-");
  if (!y || !m || !d) return `${fecha} ${hora}`;
  return `${d}/${m}/${y} · ${hora}`;
}

export function etiquetaCalificacion(calificacion: number | null) {
  if (calificacion == null) return "—";
  return `${calificacion} / 5`;
}

/** Más reciente arriba, más antigua abajo (fecha, hora y captura). */
export function compararAsambleaRecientePrimero(a: AsambleaDTO, b: AsambleaDTO): number {
  const claveA = `${a.fecha}T${a.hora}`;
  const claveB = `${b.fecha}T${b.hora}`;
  const porFechaHora = claveB.localeCompare(claveA);
  if (porFechaHora !== 0) return porFechaHora;
  return b.createdAt.localeCompare(a.createdAt);
}
