import { readFileSync, existsSync } from "fs";
import path from "path";
import circle from "@turf/circle";
import {
  centroDeGeometriaWgs84,
  reproyectarCollection,
} from "./geo-reproject.js";
import { puntoDeColonia, COYOACAN_CENTRO } from "./colonias.js";
import {
  CENTRO_DISTRITO_LOCAL,
  distritoLocalDeSeccion,
  esSeccionValida,
} from "./secciones-electorales.js";

const rootDir = process.cwd();
const SECCIONES_FILE = path.join(rootDir, "data/geo/coyoacan-secciones.geojson");
const ALCALDIA_FILE = path.join(rootDir, "data/geo/coyoacan-alcaldia.geojson");
const INE_FUENTE_URL = "https://pautas.ine.mx/transparencia/mapas/cob_2024/SECCION.zip";

type SeccionFeature = GeoJSON.Feature & {
  properties: { seccion: string; fuente?: string; vigencia?: string };
};

type SeccionesCollection = GeoJSON.FeatureCollection & {
  metadata?: {
    fuente?: string;
    url?: string;
    totalSecciones?: number;
  };
};

let cacheSecciones: SeccionesCollection | null = null;
let indiceSecciones: Map<string, SeccionFeature> | null = null;

function loadAlcaldiaGeoJson(): GeoJSON.FeatureCollection {
  return JSON.parse(readFileSync(ALCALDIA_FILE, "utf8"));
}

function loadSeccionesCoyoacan(): SeccionesCollection {
  if (cacheSecciones) return cacheSecciones;
  if (!existsSync(SECCIONES_FILE)) {
    cacheSecciones = { type: "FeatureCollection", features: [] };
    indiceSecciones = new Map();
    return cacheSecciones;
  }
  cacheSecciones = reproyectarCollection(
    JSON.parse(readFileSync(SECCIONES_FILE, "utf8")) as SeccionesCollection,
  );
  indiceSecciones = new Map(
    cacheSecciones.features.map((f) => [
      String((f.properties as { seccion: string }).seccion),
      f as SeccionFeature,
    ]),
  );
  return cacheSecciones;
}

function seccionOficial(seccion: string): SeccionFeature | null {
  loadSeccionesCoyoacan();
  return indiceSecciones?.get(seccion) ?? null;
}

export function geojsonSeccionesCoyoacan(): SeccionesCollection {
  return loadSeccionesCoyoacan();
}

export function geojsonAlcaldiaCoyoacan(): GeoJSON.FeatureCollection {
  return loadAlcaldiaGeoJson();
}

export function tieneGeometriaOficial(): boolean {
  return loadSeccionesCoyoacan().features.length > 0;
}

export type MapaSeccionResponse = {
  seccion: string;
  distritoLocal: number | null;
  centro: { lat: number; lng: number };
  fuenteCentro: "colonia" | "distrito" | "alcaldia" | "geometria-oficial";
  fuenteGeometria: "ine-oficial" | "aproximada";
  colonia: string | null;
  geometria: GeoJSON.Feature;
  alcaldia: GeoJSON.FeatureCollection;
  nota: string;
};

export function mapaDeSeccion(seccion: string, colonia?: string | null): MapaSeccionResponse | null {
  if (!esSeccionValida(seccion)) return null;

  const distritoLocal = distritoLocalDeSeccion(seccion);
  const alcaldia = loadAlcaldiaGeoJson();
  const oficial = seccionOficial(seccion);

  if (oficial?.geometry) {
    return {
      seccion,
      distritoLocal,
      centro: centroDeGeometriaWgs84(oficial),
      fuenteCentro: "geometria-oficial",
      fuenteGeometria: "ine-oficial",
      colonia: colonia ?? null,
      geometria: oficial,
      alcaldia,
      nota: "Polígono oficial de la sección electoral.",
    };
  }

  const puntoColonia = colonia ? puntoDeColonia(colonia) : null;
  let centro = COYOACAN_CENTRO;
  let fuenteCentro: MapaSeccionResponse["fuenteCentro"] = "alcaldia";
  let radioKm = 1.8;

  if (puntoColonia) {
    centro = puntoColonia;
    fuenteCentro = "colonia";
    radioKm = 0.42;
  } else if (distritoLocal && CENTRO_DISTRITO_LOCAL[distritoLocal]) {
    centro = CENTRO_DISTRITO_LOCAL[distritoLocal];
    fuenteCentro = "distrito";
    radioKm = 1.2;
  }

  const geometria = circle([centro.lng, centro.lat], radioKm, {
    steps: 64,
    units: "kilometers",
  }) as GeoJSON.Feature;

  geometria.properties = {
    seccion,
    distritoLocal,
    colonia: colonia ?? null,
  };

  const nota = tieneGeometriaOficial()
    ? "No se encontró el polígono oficial de esta sección; se muestra un área aproximada."
    : fuenteCentro === "colonia"
      ? "Área aproximada centrada en la colonia. Ejecuta npm run geo:import-secciones -w control-back para cargar polígonos oficiales."
      : "Ejecuta npm run geo:import-secciones -w control-back para importar los polígonos oficiales.";

  return {
    seccion,
    distritoLocal,
    centro,
    fuenteCentro,
    fuenteGeometria: "aproximada",
    colonia: colonia ?? null,
    geometria,
    alcaldia,
    nota,
  };
}

export const FUENTE_GEO_INE = INE_FUENTE_URL;
