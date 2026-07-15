/**
 * Importa colonias y códigos postales de Coyoacán desde el catálogo SEPOMEX.
 *
 * Fuente: https://www.correosdemexico.gob.mx/datosabiertos/cp/cpdescarga.txt
 *
 * Uso: npm run geo:import-colonias -w control-back
 *      npm run geo:import-colonias -w control-back -- --geocode
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { pipeline } from "stream/promises";

const rootDir = path.join(import.meta.dirname, "..");
const legacyPath = path.join(rootDir, "data/geo/colonias-coords-legacy.json");
const rawDir = path.join(rootDir, "data/geo/raw");
const txtPath = path.join(rawDir, "CPdescarga.txt");
const SEPOMEX_URL = "https://www.correosdemexico.gob.mx/datosabiertos/cp/cpdescarga.txt";
const CVE_ESTADO = "09";
const CVE_MUNICIPIO = "003";
const COYOACAN_CENTRO = { lat: 19.346, lng: -99.162 };
const TIPOS_EXCLUIDOS = new Set(["Gran usuario"]);
const geocode = process.argv.includes("--geocode");

type ColoniaRow = {
  nombre: string;
  cp: string;
  lat: number;
  lng: number;
  tipo?: string;
};

const ALIAS_NOMBRES: Record<string, string> = {
  "barrio la concepcion": "la concepcion",
};

function normalizarNombre(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escaparTs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function ensureSepomexTxt() {
  mkdirSync(rawDir, { recursive: true });
  if (existsSync(txtPath)) return;
  console.log("Descargando CPdescarga.txt de SEPOMEX (~14 MB)…");
  const res = await fetch(SEPOMEX_URL);
  if (!res.ok) throw new Error(`Descarga fallida: ${res.status}`);
  if (!res.body) throw new Error("Respuesta vacía");
  await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(txtPath));
}

function parseSepomex(): ColoniaRow[] {
  const raw = readFileSync(txtPath, "latin1");
  const lines = raw.split(/\r?\n/);
  const vistos = new Map<string, ColoniaRow>();

  for (const line of lines) {
    if (!/^\d/.test(line)) continue;
    const p = line.split("|");
    if (p.length < 12) continue;
    if (p[7] !== CVE_ESTADO || p[11] !== CVE_MUNICIPIO) continue;

    const cp = p[0].padStart(5, "0");
    const nombreBase = p[1].trim();
    const tipo = p[2].trim();
    if (!nombreBase || TIPOS_EXCLUIDOS.has(tipo)) continue;

    let nombre = nombreBase;
    const clave = `${normalizarNombre(nombreBase)}|${cp}`;
    const previo = vistos.get(clave);
    if (previo && previo.tipo !== tipo) {
      nombre = `${nombreBase} (${tipo})`;
    }

    vistos.set(`${normalizarNombre(nombre)}|${cp}`, {
      nombre,
      cp,
      lat: COYOACAN_CENTRO.lat,
      lng: COYOACAN_CENTRO.lng,
      tipo,
    });
  }

  return [...vistos.values()].sort((a, b) =>
    a.cp === b.cp ? a.nombre.localeCompare(b.nombre, "es") : a.cp.localeCompare(b.cp),
  );
}

function coordsExistentes() {
  const porNombre = new Map<string, { lat: number; lng: number }>();
  const porCp = new Map<string, { lat: number; lng: number; n: number }>();

  if (existsSync(legacyPath)) {
    const legacy = JSON.parse(readFileSync(legacyPath, "utf8")) as Array<{
      nombre: string;
      cp: string;
      lat: number;
      lng: number;
    }>;
    for (const c of legacy) {
      porNombre.set(normalizarNombre(c.nombre), { lat: c.lat, lng: c.lng });
      const agg = porCp.get(c.cp) ?? { lat: 0, lng: 0, n: 0 };
      agg.lat += c.lat;
      agg.lng += c.lng;
      agg.n += 1;
      porCp.set(c.cp, agg);
    }
  }

  const cpCentro = new Map<string, { lat: number; lng: number }>();
  for (const [cp, agg] of porCp) {
    cpCentro.set(cp, { lat: agg.lat / agg.n, lng: agg.lng / agg.n });
  }

  return { porNombre, cpCentro };
}

function esCentroDefault(colonia: ColoniaRow) {
  return (
    Math.abs(colonia.lat - COYOACAN_CENTRO.lat) < 0.0001 &&
    Math.abs(colonia.lng - COYOACAN_CENTRO.lng) < 0.0001
  );
}

async function geocodificar(nombre: string, cp: string) {
  const q = encodeURIComponent(`${nombre}, Coyoacán, Ciudad de México, ${cp}, México`);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=mx`;
  const res = await fetch(url, {
    headers: { "User-Agent": "control-dirigentes-coyoacan/1.0 (datos internos alcaldía)" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (!data[0]) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

async function enriquecerCoords(colonias: ColoniaRow[]) {
  const { porNombre, cpCentro } = coordsExistentes();
  let geocodificadas = 0;

  for (const colonia of colonias) {
    const clave = normalizarNombre(colonia.nombre);
    const prev =
      porNombre.get(clave) ??
      (ALIAS_NOMBRES[clave] ? porNombre.get(ALIAS_NOMBRES[clave]) : undefined);
    if (prev) {
      colonia.lat = prev.lat;
      colonia.lng = prev.lng;
      continue;
    }

    const cpPrev = cpCentro.get(colonia.cp);
    if (cpPrev) {
      colonia.lat = cpPrev.lat;
      colonia.lng = cpPrev.lng;
      continue;
    }

    if (!geocode) continue;

    if (!esCentroDefault(colonia)) continue;

    const punto = await geocodificar(colonia.nombre, colonia.cp);
    await new Promise((r) => setTimeout(r, 1100));
    if (punto) {
      colonia.lat = punto.lat;
      colonia.lng = punto.lng;
      geocodificadas++;
    }
  }

  if (geocode) console.log(`Geocodificadas con Nominatim: ${geocodificadas}`);
}

function generarArchivo(colonias: ColoniaRow[]) {
  const cps = [...new Set(colonias.map((c) => c.cp))].sort();
  const fecha = new Date().toISOString().slice(0, 10);

  const entries = colonias
    .map(
      (c) =>
        `  { nombre: "${escaparTs(c.nombre)}", cp: "${c.cp}", lat: ${c.lat.toFixed(7)}, lng: ${c.lng.toFixed(7)} },`,
    )
    .join("\n");

  return `// Catálogo de colonias de la alcaldía Coyoacán con su código postal.
// Fuente: SEPOMEX (Correos de México) — CPdescarga.txt — generado ${fecha}
// Alcaldía: Coyoacán (c_mnpio 003, Ciudad de México)
// Total: ${colonias.length} asentamientos, ${cps.length} códigos postales
// Regenerar: npm run geo:import-colonias -w control-back

export type Colonia = {
  nombre: string;
  cp: string;
  lat: number;
  lng: number;
};

export const COLONIAS_COYOACAN: Colonia[] = [
${entries}
];

const colByNombre = new Map(COLONIAS_COYOACAN.map((c) => [c.nombre, c]));
const coloniasByCp = new Map<string, Colonia[]>();

for (const colonia of COLONIAS_COYOACAN) {
  const list = coloniasByCp.get(colonia.cp) ?? [];
  list.push(colonia);
  coloniasByCp.set(colonia.cp, list);
}

export const CODIGOS_POSTALES_COYOACAN = [...coloniasByCp.keys()].sort();
export const TOTAL_COLONIAS_COYOACAN = COLONIAS_COYOACAN.length;

export const COYOACAN_CENTRO = { lat: 19.346, lng: -99.162 };

export function cpDeColonia(nombre: string): string | null {
  return colByNombre.get(nombre)?.cp ?? null;
}

export function puntoDeColonia(nombre: string): { lat: number; lng: number } | null {
  const c = colByNombre.get(nombre);
  if (!c) return null;
  return { lat: c.lat, lng: c.lng };
}

export function coloniasPorCp(cp: string): Colonia[] {
  return coloniasByCp.get(cp) ?? [];
}

export function esCodigoPostalValido(cp: string): boolean {
  return coloniasByCp.has(cp);
}

export function esColoniaValida(nombre: string): boolean {
  return colByNombre.has(nombre);
}

export function coloniaCoincideConCp(nombre: string, cp: string): boolean {
  const c = colByNombre.get(nombre);
  return !!c && c.cp === cp;
}

export function coloniasParaSelect(cp: string, coloniaActual?: string | null): Colonia[] {
  const delCp = coloniasPorCp(cp);
  if (!coloniaActual || delCp.some((c) => c.nombre === coloniaActual)) {
    return delCp;
  }
  const legacy = colByNombre.get(coloniaActual);
  if (legacy) return [legacy, ...delCp];
  return [{ nombre: coloniaActual, cp, lat: COYOACAN_CENTRO.lat, lng: COYOACAN_CENTRO.lng }, ...delCp];
}

export function coloniaPorDefectoDeCp(cp: string): string {
  const colonias = coloniasPorCp(cp);
  return colonias.length === 1 ? colonias[0].nombre : "";
}
`;
}

async function main() {
  await ensureSepomexTxt();
  const colonias = parseSepomex();
  console.log(`Asentamientos Coyoacán (SEPOMEX): ${colonias.length}`);
  console.log(`Códigos postales únicos: ${new Set(colonias.map((c) => c.cp)).size}`);

  await enriquecerCoords(colonias);

  const contenido = generarArchivo(colonias);
  const frontPath = path.join(rootDir, "../front/src/lib/colonias.ts");
  const backPath = path.join(rootDir, "src/lib/colonias.ts");
  writeFileSync(frontPath, contenido, "utf8");
  writeFileSync(backPath, contenido, "utf8");
  console.log(`Escrito ${frontPath}`);
  console.log(`Escrito ${backPath}`);

  writeFileSync(
    path.join(rawDir, "colonias-coyoacan.manifest.json"),
    JSON.stringify(
      {
        fuente: SEPOMEX_URL,
        totalColonias: colonias.length,
        totalCp: new Set(colonias.map((c) => c.cp)).size,
        generadoEn: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
