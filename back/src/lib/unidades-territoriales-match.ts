/**
 * Empareja colonias SEPOMEX con unidades territoriales del IECM (Coyoacán).
 * Fuente UT: geoutcdmx.iecm.mx — geometries/participacion_uts
 *
 * Regla: colonia↔UT solo por clave IECM (COLONIA_UT_CLAVES). Sin coincidencias de nombre en runtime.
 */

export {
  COLONIA_UT_CLAVES,
  enlaceColoniaUtValido,
} from "./colonia-ut-claves.js";

import { COLONIA_UT_CLAVES, enlaceColoniaUtValido } from "./colonia-ut-claves.js";

/** Alias usados solo al regenerar COLONIA_UT_CLAVES (scripts/generate-colonia-ut-claves.ts). */
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
  "santa ursula coapa": ["santa ursula coapa", "pueblo santa ursula coapa"],
  "bosques de tetlameya": ["bosques de tetlameya", "santa ursula bosques de tetlameya"],
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
  "joyas del pedregal": ["villas del pedregal"],
  "pedregal de carrasco": ["vistas del maurel"],
  "pedregal de coyoacan": ["jardines de coyoacan"],
  "pedregal del sur": ["pedregal de san angel"],
  "la otra banda": ["viejo ejido santa ursula coapa"],
  "sector marina": ["ciudad universitaria"],
  "empleados federales": ["copilco universidad"],
  "san diego churubusco": ["barrio originario de san diego churubusco"],
  "pueblo de san pablo tepetlapa": ["pueblo san pablo tepetlapa"],
  "pueblo de santa ursula coapa": ["pueblo santa ursula coapa"],
  "viejo ejido de santa ursula coapa": ["viejo ejido santa ursula coapa"],
  "ex ejido de santa ursula coapa": ["viejo ejido santa ursula coapa"],
  "jardines del pedregal de san angel": ["jardines del pedregal"],
  "prados de coyoacan": ["prados de coyoacan 1", "prados de coyoacan 2", "prados de coyoacan 3"],
  "presidentes ejidales 1a seccion": ["presidentes ejidales primera seccion"],
  "presidentes ejidales 2a seccion": ["presidentes ejidales segunda seccion"],
  "santa martha del sur quetzalcoatl": ["santa martha del sur"],
  "alianza popular revolucionaria": [
    "alianza popular revolucionaria norte",
    "alianza popular revolucionaria poniente",
    "alianza popular revolucionaria oriente",
  ],
  cafetales: ["cafetales i", "cafetales ii", "cafetales iii"],
  "la virgen": ["la virgen 1170"],
  "emiliano zapata fraccionamiento popular": ["emiliano zapata"],
};

const ROMAN = /\b(i{1,3}|iv|v|vi{0,3}|ix|x|xi{0,3})\b\.?$/i;
const SECCION_LABEL = /\bseccion\b/i;

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

type UtLike = { clave: string; nombre: string };

/** Valida colonia↔UT únicamente por clave IECM autorizada. */
export function utCoincideConColonia(
  coloniaNombre: string,
  _utNombre: string,
  utClave?: string,
): boolean {
  if (!utClave) return false;
  return enlaceColoniaUtValido(coloniaNombre, utClave);
}

export function utsParaColonia<T extends UtLike>(coloniaNombre: string, uts: T[]): T[] {
  const claves = COLONIA_UT_CLAVES[coloniaNombre];
  if (!claves?.length) return [];
  return uts.filter((ut) => claves.includes(ut.clave));
}
