/**
 * Empareja colonias SEPOMEX con unidades territoriales del IECM (Coyoacán).
 * Fuente UT: geoutcdmx.iecm.mx — geometries/participacion_uts
 */

const ROMAN = /\b(i{1,3}|iv|v|vi{0,3}|ix|x|xi{0,3})\b\.?$/i;
const SECCION_LABEL = /\bseccion\b/i;

/** Mapeo directo colonia → claves UT cuando los nombres oficiales no coinciden */
export const COLONIA_UT_CLAVES: Record<string, string[]> = {
  "Culhuacán CTM Sección I": ["03-056"],
  "Culhuacán CTM Sección II": ["03-057"],
  "Culhuacán CTM Sección III": ["03-058"],
  "Culhuacán CTM Sección V": ["03-029"],
  "Culhuacán CTM Sección VI": ["03-030"],
  "Culhuacán CTM Sección VII": ["03-031"],
  "Culhuacán CTM Sección VIII": ["03-033", "03-162"],
  "Culhuacán CTM Sección IX-A": ["03-028"],
  "Culhuacán CTM Sección IX-B": ["03-027", "03-156"],
  "Culhuacán CTM Sección X": ["03-034"],
  "Culhuacán CTM Sección X-A": ["03-034"],
  "Culhuacán CTM Sección Piloto": ["03-093"],
  "Huayamilpas": ["03-003"],
  "El Rosario": ["03-097"],
  "Empleados Federales": ["03-024", "03-161"],
  "Ermita Churubusco": ["03-100"],
  "Ex-Ejido de San Pablo Tepetlapa": ["03-105"],
  "Fortín de Chimalistac": ["03-019"],
  "Torres de Chimalistac": ["03-019"],
  "Joyas del Pedregal": ["03-123"],
  "La Otra Banda": ["03-113"],
  "Modulo Social Imán": ["03-054", "03-055"],
  "Nueva Díaz Ordaz": ["03-082"],
  "Pedregal de Carrasco": ["03-124"],
  "Pedregal de Coyoacán": ["03-061"],
  "Pedregal del Sur": ["03-088", "03-173"],
  "Residencial la Cantera": ["03-064"],
  "San Francisco Culhuacán Barrio de La Magdalena": ["03-066"],
  "San Francisco Culhuacán Barrio de San Francisco": ["03-101"],
  "San Francisco Culhuacán Barrio de San Juan": ["03-101"],
  "San Francisco Culhuacán Barrio de Santa Ana": ["03-101"],
  "Sector Marina": ["03-021"],
  "Tlalpan FOVISSSTE": ["03-164"],
  "Universidad Nacional Autónoma de México": ["03-021"],
  "Villa de San Francisco": ["03-089"],
  "Villas Copilco": ["03-024", "03-161"],
};

/** Alias de nombres normalizados cuando difieren entre SEPOMEX e IECM */
export const ALIAS_COLONIA_A_UT: Record<string, string[]> = {
  "pedregal de santo domingo": ["pedregal de sto domingo"],
  "barrio la concepcion": ["la concepcion"],
  "barrio santa catarina": ["santa catarina"],
  "barrio san lucas": ["san lucas"],
  "barrio del nino jesus": ["del nino jesus"],
  "barrio oxtopulco universidad": ["oxtopulco universidad"],
  "pueblo la candelaria": ["pueblo la candelaria"],
  "pueblo de los reyes": ["pueblo de los reyes hueytlilac", "pueblo de los reyes"],
  "ex ejido de san francisco culhuacan": ["ex ejido san francisco culhuacan"],
  "culhuacan ctm croc": ["croc culhuacan secc 6"],
  "culhuacan ctm canal nacional": ["canal nacional"],
  "santa ursula coapa": ["santa ursula", "bosques de tetlameya", "pueblo santa ursula coapa"],
  "bosques de tetlameya": ["bosques de tetlameya", "santa ursula"],
  "ciudad universitaria": ["ciudad universitaria"],
  "churubusco country club": ["country club", "churubusco country club"],
  "parque san andres": ["parque san andres", "san andres totoltepec"],
  "el rosario": ["rancho el rosario"],
  "huayamilpas": ["ajusco huayamilpas"],
  "nueva diaz ordaz": ["estudiantes de 1968 nueva diaz ordaz"],
  "modulo social iman": ["iman", "iman 580"],
  "residencial la cantera": ["la cantera"],
  "ex ejido de san pablo tepetlapa": ["pueblo san pablo tepetlapa"],
  "fortin de chimalistac": ["chimalistac"],
  "torres de chimalistac": ["chimalistac"],
  "tlalpan fovissste": ["fovisste universidad"],
  "universidad nacional autonoma de mexico": ["ciudad universitaria"],
  "villa de san francisco": ["pedregal de san francisco"],
  "villas copilco": ["copilco universidad"],
  "ermita churubusco": ["san diego churubusco"],
  "joyas del pedregal": ["villas del pedregal"],
  "pedregal de carrasco": ["vistas del maurel"],
  "pedregal de coyoacan": ["jardines de coyoacan"],
  "pedregal del sur": ["pedregal de san angel"],
  "la otra banda": ["viejo ejido santa ursula coapa"],
  "sector marina": ["ciudad universitaria"],
  "empleados federales": ["copilco universidad"],
};

export function normalizarNombreTerritorial(value: string, opts?: { conservarSeccion?: boolean }): string {
  let text = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\but\b/g, " ")
    .replace(/\bsto\b/g, "santo")
    .replace(/\bst\b(?=\s)/g, "santo")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ");

  if (!opts?.conservarSeccion) {
    text = text.replace(SECCION_LABEL, " ");
    text = text.replace(ROMAN, " ");
  }

  return text.replace(/\s+/g, " ").trim();
}

export function baseNombreTerritorial(value: string): string {
  return normalizarNombreTerritorial(value.replace(/\s+UT$/i, ""));
}

function tokensSignificativos(value: string): string[] {
  const stop = new Set(["de", "del", "la", "las", "los", "el", "y", "en", "a"]);
  return value.split(" ").filter((t) => t.length > 2 && !stop.has(t));
}

function coincidePorTokens(coloniaBase: string, utBase: string): boolean {
  const coloniaTokens = tokensSignificativos(coloniaBase);
  const utTokens = new Set(tokensSignificativos(utBase));
  if (coloniaTokens.length === 0) return false;

  const hits = coloniaTokens.filter((t) => utTokens.has(t)).length;
  if (coloniaTokens.length === 1) {
    return hits === 1;
  }
  return hits / coloniaTokens.length >= 0.85;
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

  const romanMatch = coloniaPart.match(/^(i{1,3}|iv|v|vi{0,3}|ix|x)$/);
  if (romanMatch) {
    const roman = romanMatch[1];
    return utNorm.includes(`ctm ${roman} culhuacan`);
  }

  return false;
}

type UtLike = { clave: string; nombre: string };

export function utCoincideConColonia(coloniaNombre: string, utNombre: string): boolean {
  const coloniaBase = baseNombreTerritorial(coloniaNombre);
  const utBase = baseNombreTerritorial(utNombre);
  if (!coloniaBase || !utBase) return false;

  if (coloniaBase === utBase) return true;
  if (utBase.startsWith(coloniaBase) || coloniaBase.startsWith(utBase)) return true;

  if (coincideCtmSeccion(coloniaNombre, utNombre)) return true;

  const alias = ALIAS_COLONIA_A_UT[coloniaBase] ?? [];
  for (const candidato of alias) {
    const c = baseNombreTerritorial(candidato);
    if (utBase === c || utBase.startsWith(c) || c.startsWith(utBase)) return true;
    if (coincidePorTokens(c, utBase)) return true;
  }

  return coincidePorTokens(coloniaBase, utBase);
}

export function utsParaColonia<T extends UtLike>(coloniaNombre: string, uts: T[]): T[] {
  const claves = COLONIA_UT_CLAVES[coloniaNombre];
  if (claves?.length) {
    const porClave = uts.filter((ut) => claves.includes(ut.clave));
    if (porClave.length) return porClave;
  }

  return uts.filter((ut) => utCoincideConColonia(coloniaNombre, ut.nombre));
}
