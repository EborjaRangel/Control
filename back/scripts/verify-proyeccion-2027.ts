/**
 * Verifica homologación y proyección 2027 contra el JSON IECM.
 * Ejecutar: npx tsx back/scripts/verify-proyeccion-2027.ts
 */
import fs from "node:fs";
import path from "node:path";

type PartidoVotosSeccion = { clave: string; etiqueta: string; votos: number; porcentaje: number };
type ResultadoAlcaldiaSeccion = {
  listaNominal: number;
  votacionTotal: number;
  participacionPct: number;
  votosNulos: number;
  votosNulosPct: number;
  partidos: PartidoVotosSeccion[];
};
type ResultadoAlcaldiaAnio = {
  anio: number;
  porSeccion: Record<string, ResultadoAlcaldiaSeccion>;
};

const jsonPath = path.join(
  process.cwd(),
  "back/data/electoral/resultados-alcaldia-coyoacan.json",
);

// Inline minimal copy of distribuir/resumir to avoid front imports in script
const META = new Set([
  "CNR",
  "DISTRITO_LOCAL",
  "CLAVE_DEM",
  "ID_CASILLA",
  "SECCION",
  "CASILLA",
  "TIPO_CASILLA",
  "EXT_CONTIGUA",
]);
const TOKENS_MORENA = new Set(["MOR", "MORENA", "PT", "PRD", "PES", "PVEM"]);
const TOKENS_PAN = new Set(["PAN", "PRI"]);

function pesosCoalicion(clave: string) {
  const tokens = clave.toUpperCase().split("_").filter(Boolean);
  const blocs: string[] = [];
  for (const token of tokens) {
    if (token === "MC" || token === "CONVERGENCIA") blocs.push("mc");
    else if (TOKENS_PAN.has(token)) blocs.push("pan");
    else if (TOKENS_MORENA.has(token)) blocs.push("morena");
  }
  if (blocs.length <= 1) return null;
  const counts = { morena: 0, pan: 0, mc: 0 };
  for (const b of blocs) counts[b as keyof typeof counts] += 1;
  const total = blocs.length;
  return { morena: counts.morena / total, pan: counts.pan / total, mc: counts.mc / total };
}

function distribuir(clave: string, votos: number) {
  const out = { morena: 0, pan: 0, mc: 0, otros: 0 };
  const k = clave.toUpperCase();
  if (META.has(k)) return out;
  if (k === "MC" || k.includes("CONVERGENCIA")) {
    out.mc = votos;
    return out;
  }
  if (k === "MORENA" || k.includes("MORENA") || k === "PRD_PT" || k === "PRD" || k === "PT") {
    out.morena = votos;
    return out;
  }
  if (k === "PAN" || k === "PRI" || k.startsWith("PRI_") || k === "PAN_PRI") {
    out.pan = votos;
    return out;
  }
  if (["PT_MOR", "MOR_PES", "PT_MOR_PES", "PT_MORENA", "PVEM_PT_MORENA"].includes(k)) {
    out.morena = votos;
    return out;
  }
  const split = pesosCoalicion(k);
  if (split) {
    out.morena += votos * split.morena;
    out.pan += votos * split.pan;
    out.mc += votos * split.mc;
    return out;
  }
  out.otros = votos;
  return out;
}

function resumir(resultado: ResultadoAlcaldiaSeccion) {
  const acum = { morena: 0, pan: 0, mc: 0, otros: 0 };
  for (const p of resultado.partidos.filter((x) => !META.has(x.clave.toUpperCase()) && x.votos > 0)) {
    const d = distribuir(p.clave, p.votos);
    acum.morena += d.morena;
    acum.pan += d.pan;
    acum.mc += d.mc;
    acum.otros += d.otros;
  }
  const sumClasificado = acum.morena + acum.pan + acum.mc + acum.otros;
  const faltante = resultado.votacionTotal - sumClasificado;
  if (faltante > 0) acum.otros += faltante;

  const total = resultado.votacionTotal;
  return {
    morena: total > 0 ? (acum.morena / total) * 100 : 0,
    pan: total > 0 ? (acum.pan / total) * 100 : 0,
    mc: total > 0 ? (acum.mc / total) * 100 : 0,
    otros: total > 0 ? (acum.otros / total) * 100 : 0,
    sumPct:
      total > 0 ? ((acum.morena + acum.pan + acum.mc + acum.otros) / total) * 100 : 0,
  };
}

function regresion(puntos: { x: number; y: number }[], xProj = 2027) {
  if (puntos.length < 2) return puntos[0]?.y ?? null;
  const n = puntos.length;
  let sx = 0,
    sy = 0,
    sxy = 0,
    sx2 = 0;
  for (const p of puntos) {
    sx += p.x;
    sy += p.y;
    sxy += p.x * p.y;
    sx2 += p.x * p.x;
  }
  const d = n * sx2 - sx * sx;
  if (Math.abs(d) < 1e-9) return sy / n;
  const b = (n * sxy - sx * sy) / d;
  const a = (sy - b * sx) / n;
  return a + b * xProj;
}

const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Record<string, ResultadoAlcaldiaAnio>;
const anios = [2015, 2018, 2021, 2024] as const;

let cuadreOk = 0;
let cuadreBad = 0;
let maxDesv = 0;
const secciones = new Set<string>();
for (const y of anios) {
  for (const sec of Object.keys(raw[String(y)]?.porSeccion ?? {})) secciones.add(sec);
}

let projMorena = 0;
let projPan = 0;
let projMc = 0;
let ganaMorena = 0;
let ganaPan = 0;
let ganaMc = 0;

for (const sec of secciones) {
  const series = { morena: [] as { x: number; y: number }[], pan: [], mc: [] } as Record<
    string,
    { x: number; y: number }[]
  >;
  let lista = 0;
  let part = 0;

  for (const y of anios) {
    const r = raw[String(y)]?.porSeccion?.[sec];
    if (!r) continue;
    const b = resumir(r);
    const desv = Math.abs(b.sumPct - 100);
    maxDesv = Math.max(maxDesv, desv);
    if (desv <= 1.5) cuadreOk++;
    else cuadreBad++;
    series.morena.push({ x: y, y: b.morena });
    series.pan.push({ x: y, y: b.pan });
    series.mc.push({ x: y, y: b.mc });
    lista = r.listaNominal || lista;
    part = r.participacionPct || part;
  }

  if (series.morena.length < 2) continue;

  const m = regresion(series.morena) ?? 0;
  const p = regresion(series.pan) ?? 0;
  const c = regresion(series.mc) ?? 0;
  const main = m + p + c;
  const scale = main > 0 ? 100 / main : 1;
  const nm = (m * scale);
  const np = (p * scale);
  const nc = (c * scale);
  const votos = Math.round((lista * part) / 100);
  projMorena += Math.round((votos * nm) / 100);
  projPan += Math.round((votos * np) / 100);
  projMc += Math.round((votos * nc) / 100);

  if (nm >= np && nm >= nc) ganaMorena++;
  else if (np >= nm && np >= nc) ganaPan++;
  else ganaMc++;
}

const total = projMorena + projPan + projMc;
console.log("=== Verificación proyección 2027 (Coyoacán) ===");
console.log("Secciones únicas:", secciones.size);
console.log("Cuadre histórico OK (≤1.5 pp):", cuadreOk);
console.log("Cuadre histórico revisar:", cuadreBad);
console.log("Máx. desviación cuadre:", maxDesv.toFixed(2), "pp");
console.log("");
console.log("Proyección agregada 2027:");
console.log("  MORENA+PT+PRD:", projMorena.toLocaleString("es-MX"), `($${((projMorena / total) * 100).toFixed(2)}%)`.replace("$", ""));
console.log("  PAN+PRI:", projPan.toLocaleString("es-MX"), `(${((projPan / total) * 100).toFixed(2)}%)`);
console.log("  MC:", projMc.toLocaleString("es-MX"), `(${((projMc / total) * 100).toFixed(2)}%)`);
console.log("");
console.log("Secciones ganadas:");
console.log("  MORENA+PT+PRD:", ganaMorena);
console.log("  PAN+PRI:", ganaPan);
console.log("  MC:", ganaMc);
console.log("");
console.log(
  "Ganador:",
  projMorena > projPan && projMorena > projMc
    ? "MORENA+PT+PRD"
    : projPan > projMorena && projPan > projMc
      ? "PAN+PRI"
      : "MC",
);
