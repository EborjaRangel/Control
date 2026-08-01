import { readFileSync } from "fs";
import path from "path";
import { baseNombreTerritorial } from "../src/lib/unidades-territoriales-match.js";

const raw = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "../data/geo/raw/iecm-uts.json"), "utf8"),
) as {
  features: { properties: { cve_ut: string; nombre: string; cve_demarc: number } }[];
};

const uts = raw.features
  .filter((f) => parseInt(String(f.properties.cve_demarc), 10) === 3)
  .map((f) => ({
    clave: f.properties.cve_ut,
    nombre: f.properties.nombre.replace(/\s+UT$/i, "").trim(),
    base: baseNombreTerritorial(f.properties.nombre.replace(/\s+UT$/i, "").trim()),
  }));

const pendientes: Record<string, string[]> = {
  "Alianza Popular Revolucionaria": ["alianza popular revolucionaria"],
  Cafetales: ["cafetales"],
  Copilco: ["copilco"],
  "Copilco Universidad ISSSTE": ["copilco universidad", "issste"],
  "Emiliano Zapata Fraccionamiento Popular": ["emiliano zapata fraccionamiento", "emiliano zapata"],
  "Ex-Ejido de Santa Úrsula Coapa": ["ex ejido santa ursula", "viejo ejido santa ursula"],
  "Jardines del Pedregal de San Ángel": ["jardines del pedregal"],
  "La Virgen": ["la virgen"],
  "Prados de Coyoacán": ["prados de coyoacan"],
  "Presidentes Ejidales 1a Sección": ["presidentes ejidales primera", "presidentes ejidales 1"],
  "Presidentes Ejidales 2a Sección": ["presidentes ejidales segunda", "presidentes ejidales 2"],
  "Pueblo de San Pablo Tepetlapa": ["pueblo san pablo tepetlapa", "san pablo tepetlapa"],
  "Pueblo de Santa Úrsula Coapa": ["pueblo santa ursula coapa", "santa ursula coapa"],
  "San Diego Churubusco": ["san diego churubusco", "barrio originario de san diego churubusco"],
  "Santa Martha del Sur Quetzalcoatl": ["santa martha del sur"],
  "Viejo Ejido de Santa Úrsula Coapa": ["viejo ejido santa ursula coapa"],
};

for (const [colonia, patrones] of Object.entries(pendientes)) {
  const hits = uts.filter((u) => patrones.some((p) => u.base.includes(p)));
  console.log(`\n${colonia}:`);
  for (const h of hits) console.log(`  ${h.clave} ${h.nombre}`);
}
