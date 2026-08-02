import { createWriteStream, existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import { pipeline } from "stream/promises";

const IECM_URL =
  "https://geoutcdmx.iecm.mx/api-proxy.php?endpoint=geometries%2Fparticipacion_uts&limit=1851&offset=0";

/** Rutas candidatas: raw (local/import) y copia versionada para deploy. */
export function rutasIecmUtsJson(rootDir = path.join(process.cwd())): string[] {
  return [
    path.join(rootDir, "data/geo/raw/iecm-uts.json"),
    path.join(rootDir, "data/geo/iecm-uts.json"),
  ];
}

export function resolverIecmUtsJsonPath(rootDir = path.join(process.cwd())): string | null {
  for (const file of rutasIecmUtsJson(rootDir)) {
    if (existsSync(file)) return file;
  }
  return null;
}

export async function ensureIecmUtsGeoJson(rootDir = path.join(process.cwd())): Promise<string> {
  const existing = resolverIecmUtsJsonPath(rootDir);
  if (existing) return existing;

  const rawDir = path.join(rootDir, "data/geo/raw");
  const jsonPath = path.join(rawDir, "iecm-uts.json");
  mkdirSync(rawDir, { recursive: true });

  console.log("Descargando catálogo IECM (geometrías UT)…");
  const res = await fetch(IECM_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Descarga IECM fallida: ${res.status}`);
  if (!res.body) throw new Error("Respuesta vacía del IECM");
  await pipeline(
    res.body as unknown as NodeJS.ReadableStream,
    createWriteStream(jsonPath),
  );

  if (!existsSync(jsonPath)) {
    throw new Error(`No se creó ${jsonPath}`);
  }

  return jsonPath;
}

export function leerIecmUtsGeoJson(rootDir = path.join(process.cwd())): {
  features: {
    properties: { cve_ut: string; cve_demarc: number };
    geometry: unknown;
  }[];
} | null {
  const file = resolverIecmUtsJsonPath(rootDir);
  if (!file) return null;
  return JSON.parse(readFileSync(file, "utf8")) as {
    features: {
      properties: { cve_ut: string; cve_demarc: number };
      geometry: unknown;
    }[];
  };
}
