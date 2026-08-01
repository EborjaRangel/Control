import { readFileSync } from "fs";
import path from "path";

const raw = JSON.parse(
  readFileSync(path.join(import.meta.dirname, "../data/geo/raw/iecm-uts.json"), "utf8"),
) as { features: { properties: { cve_ut: string; nombre: string; cve_demarc: number } }[] };

for (const f of raw.features) {
  if (Number(f.properties.cve_demarc) !== 3) continue;
  if (/churubusco|ermita/i.test(f.properties.nombre)) {
    console.log(f.properties.cve_ut, f.properties.nombre);
  }
}
