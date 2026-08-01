/**
 * Centroides de referencia para colonias que comparten la misma UT IECM.
 * Fuente: OSM/Nominatim (iglesias barriales) e IECM (centroide UT barrio).
 */
export type PuntoReferenciaColonia = { lat: number; lng: number };

export const COLONIA_PUNTOS_REFERENCIA: Record<string, PuntoReferenciaColonia> = {
  "San Francisco Culhuacán Barrio de San Francisco": {
    lat: 19.33388,
    lng: -99.12101,
  },
  "San Francisco Culhuacán Barrio de San Juan": {
    lat: 19.3318,
    lng: -99.1188,
  },
  "San Francisco Culhuacán Barrio de Santa Ana": {
    lat: 19.3292466,
    lng: -99.1202022,
  },
  "San Francisco Culhuacán Barrio de La Magdalena": {
    lat: 19.34343994,
    lng: -99.11834518,
  },
};

export function puntoReferenciaColonia(coloniaNombre: string): PuntoReferenciaColonia | null {
  return COLONIA_PUNTOS_REFERENCIA[coloniaNombre] ?? null;
}
