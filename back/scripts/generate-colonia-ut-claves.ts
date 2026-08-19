/**
 * Genera mapeo colonia → claves UT (exacto / alias / CTM).
 * Uso: npx tsx scripts/generate-colonia-ut-claves.ts
 */

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { COLONIAS_COYOACAN } from "../src/lib/colonias.js";
import {
  ALIAS_COLONIA_A_UT,
  baseNombreTerritorial,
  normalizarNombreTerritorial,
} from "../src/lib/unidades-territoriales-match.js";

const rootDir = path.join(import.meta.dirname, "..");
const jsonPath = path.join(rootDir, "data/geo/raw/iecm-uts.json");

type UtRow = { clave: string; nombre: string };

function utsCoyoacan(): UtRow[] {
  const raw = JSON.parse(readFileSync(jsonPath, "utf8")) as {
    features: { properties: { cve_ut: string; nombre: string; cve_demarc: number } }[];
  };
  return raw.features
    .filter((f) => parseInt(String(f.properties.cve_demarc), 10) === 3)
    .map((f) => ({
      clave: f.properties.cve_ut,
      nombre: f.properties.nombre.replace(/\s+UT$/i, "").trim(),
    }));
}

function coincideCtmSeccion(coloniaNombre: string, utNombre: string): boolean {
  const coloniaNorm = normalizarNombreTerritorial(coloniaNombre, { conservarSeccion: true });
  if (!coloniaNorm.includes("culhuacan ctm seccion")) return false;

  const utNorm = normalizarNombreTerritorial(utNombre);
  if (!utNorm.includes("ctm") && !utNorm.includes("infonavit culhuacan")) return false;

  const coloniaPart = coloniaNorm.replace("culhuacan ctm seccion", "").trim();
  if (!coloniaPart) return false;

  if (coloniaPart === "i" && utNorm.includes("infonavit culhuacan zona 1")) return true;
  if (coloniaPart === "ii" && utNorm.includes("infonavit culhuacan zona 2")) return true;
  if (coloniaPart === "iii" && utNorm.includes("infonavit culhuacan zona 3")) return true;
  if (coloniaPart === "piloto" && utNorm.includes("piloto culhuacan")) return true;
  if (coloniaPart === "ix a" && utNorm.includes("ctm ix a culhuacan")) return true;
  if (coloniaPart === "ix b" && utNorm.includes("ctm ix culhuacan")) return true;
  if (coloniaPart === "x a" && utNorm.includes("ctm x culhuacan")) return true;
  if (coloniaPart === "viii") {
    return utNorm.includes("ctm viii culhuacan") || utNorm.includes("ctm viii b culhuacan");
  }

  const romanMatch = coloniaPart.match(/^(i{1,3}|iv|v|vi{0,3}|ix|x)$/);
  if (romanMatch) {
    return utNorm.includes(`ctm ${romanMatch[1]} culhuacan`);
  }

  return false;
}

const MANUAL_OVERRIDES: Record<string, string[]> = {
  "Alianza Popular Revolucionaria": ["03-131", "03-132", "03-148"],
  Cafetales: ["03-010", "03-011", "03-160"],
  Copilco: ["03-022", "03-023", "03-024", "03-161"],
  "Copilco Universidad ISSSTE": ["03-024", "03-161"],
  "Culhuacán CTM Sección Piloto": ["03-093"],
  "Culhuacán CTM Sección VIII": ["03-033", "03-162"],
  "Emiliano Zapata Fraccionamiento Popular": ["03-048", "03-049"],
  "Ermita Churubusco": ["03-094"],
  "Ex-Ejido de Santa Úrsula Coapa": ["03-113"],
  "Huayamilpas": ["03-003"],
  "Jardines del Pedregal de San Ángel": ["03-062"],
  "La Virgen": ["03-067"],
  "Nueva Díaz Ordaz": ["03-082"],
  "Prados de Coyoacán": ["03-095", "03-168", "03-171"],
  "Presidentes Ejidales 1a Sección": ["03-096"],
  "Presidentes Ejidales 2a Sección": ["03-152"],
  "Pueblo de San Pablo Tepetlapa": ["03-105"],
  "Pueblo de Santa Úrsula Coapa": ["03-109"],
  "San Diego Churubusco": ["03-100"],
  "San Francisco Culhuacán Barrio de La Magdalena": ["03-066"],
  "San Francisco Culhuacán Barrio de San Francisco": ["03-101"],
  "San Francisco Culhuacán Barrio de San Juan": ["03-101"],
  "San Francisco Culhuacán Barrio de Santa Ana": ["03-101"],
  "Santa Martha del Sur Quetzalcoatl": ["03-108"],
  "Tlalpan FOVISSSTE": ["03-164"],
  "Viejo Ejido de Santa Úrsula Coapa": ["03-113"],
};

function clavesParaColonia(colonia: string, uts: UtRow[]): string[] {
  if (MANUAL_OVERRIDES[colonia]) return MANUAL_OVERRIDES[colonia];

  const base = baseNombreTerritorial(colonia);
  const claves = new Set<string>();

  for (const ut of uts) {
    const utBase = baseNombreTerritorial(ut.nombre);
    if (base === utBase) claves.add(ut.clave);
  }

  const alias = ALIAS_COLONIA_A_UT[base] ?? [];
  for (const ut of uts) {
    const utBase = baseNombreTerritorial(ut.nombre);
    for (const candidato of alias) {
      const c = baseNombreTerritorial(candidato);
      if (utBase === c || utBase.startsWith(`${c} `)) {
        claves.add(ut.clave);
      }
    }
  }

  for (const ut of uts) {
    if (coincideCtmSeccion(colonia, ut.nombre)) claves.add(ut.clave);
  }

  // Pedregal de Santo Domingo: varias UT numeradas
  if (colonia === "Pedregal de Santo Domingo") {
    for (const ut of uts) {
      const utBase = baseNombreTerritorial(ut.nombre);
      if (utBase.startsWith("pedregal de sto domingo")) claves.add(ut.clave);
    }
  }

  return [...claves].sort();
}

function main() {
  const uts = utsCoyoacan();
  const colonias = [...new Set(COLONIAS_COYOACAN.map((c) => c.nombre))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );

  const completo: Record<string, string[]> = {};
  const sinClave: string[] = [];
  const multiples: string[] = [];

  for (const colonia of colonias) {
    const claves = clavesParaColonia(colonia, uts);
    if (!claves.length) {
      sinClave.push(colonia);
      continue;
    }
    completo[colonia] = claves;
    if (claves.length > 1) {
      multiples.push(`${colonia} → ${claves.join(", ")}`);
    }
  }

  console.log(`Colonias: ${colonias.length}`);
  console.log(`Con claves UT: ${Object.keys(completo).length}`);
  console.log(`Sin claves UT: ${sinClave.length}`);
  if (sinClave.length) {
    console.log("Sin clave:");
    for (const c of sinClave) console.log(`  - ${c}`);
  }

  console.log("\n--- COLONIA_UT_CLAVES (generado) ---\n");
  const outPath = path.join(rootDir, "src/lib/colonia-ut-claves.ts");

  for (const colonia of sinClave) {
    if (MANUAL_OVERRIDES[colonia]) completo[colonia] = MANUAL_OVERRIDES[colonia];
  }

  const finalLines = [
    "/**",
    " * Mapeo autoritativo colonia SEPOMEX → claves UT IECM (Coyoacán).",
    " * Regenerar: npx tsx scripts/generate-colonia-ut-claves.ts",
    " */",
    "",
    "export const COLONIA_UT_CLAVES: Record<string, string[]> = {",
  ];
  for (const [colonia, claves] of Object.entries(completo).sort(([a], [b]) =>
    a.localeCompare(b, "es"),
  )) {
    finalLines.push(
      `  "${colonia.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}": [${claves.map((c) => `"${c}"`).join(", ")}],`,
    );
  }
  finalLines.push("};", "");
  finalLines.push(
    "/** Valida enlace colonia↔UT únicamente por clave IECM (sin coincidencias de nombre). */",
  );
  finalLines.push("export function enlaceColoniaUtValido(coloniaNombre: string, utClave: string): boolean {");
  finalLines.push("  const claves = COLONIA_UT_CLAVES[coloniaNombre];");
  finalLines.push("  return claves?.includes(utClave) ?? false;");
  finalLines.push("}", "");

  writeFileSync(outPath, finalLines.join("\n"), "utf8");
  console.log(`Escrito: ${outPath}`);
  console.log(`Entradas: ${Object.keys(completo).length}`);
}

main();
