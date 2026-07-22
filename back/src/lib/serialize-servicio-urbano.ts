import type { TipoServicioUrbano } from "../generated/prisma/client.js";
import { nombreCompleto } from "./dirigentes.js";

export const TIPO_SERVICIO_URBANO_LABEL: Record<TipoServicioUrbano, string> = {
  FUGA_AGUA: "Fuga de agua",
  BACHE: "Bache",
  DESASOLVE_COLADERA: "Desazolve de coladera",
  PODA_ARBOL: "Poda de árbol",
  LUMINARIAS_FUNDIDAS: "Luminarias fundidas",
};

type ReporteRow = {
  id: string;
  dirigenteId: string;
  tipo: TipoServicioUrbano;
  descripcion: string | null;
  colonia: string | null;
  seccionElectoral: string | null;
  lat: number;
  lng: number;
  fotoAntesUrl: string;
  fotoDespuesUrl: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
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

export function serializeReporteServicioUrbano(r: ReporteRow) {
  return {
    id: r.id,
    dirigenteId: r.dirigenteId,
    tipo: r.tipo,
    tipoLabel: TIPO_SERVICIO_URBANO_LABEL[r.tipo],
    descripcion: r.descripcion,
    colonia: r.colonia,
    seccionElectoral: r.seccionElectoral,
    lat: r.lat,
    lng: r.lng,
    fotoAntesUrl: r.fotoAntesUrl,
    fotoDespuesUrl: r.fotoDespuesUrl,
    activo: r.activo,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    dirigente: r.dirigente
      ? {
          id: r.dirigente.id,
          nombreCompleto: nombreCompleto(r.dirigente),
          tipo: r.dirigente.tipo,
          colonia: r.dirigente.colonia,
          seccionElectoral: r.dirigente.seccionElectoral,
          activo: r.dirigente.activo,
        }
      : null,
  };
}

export type ReporteServicioUrbanoDTO = ReturnType<typeof serializeReporteServicioUrbano>;
