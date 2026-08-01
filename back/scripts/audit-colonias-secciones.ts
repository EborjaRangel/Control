import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { enlaceColoniaUtValido } from "../src/lib/colonia-ut-claves.js";
import { baseNombreTerritorial } from "../src/lib/unidades-territoriales-match.js";
import { SECCIONES_ELECTORALES_COYOACAN } from "../src/lib/secciones-electorales.js";

type UtRow = {
  clave: string;
  nombre: string;
  seccionesElectorales: string[];
};

type EnlaceSeccion = {
  colonia: string;
  utClave: string;
  utNombre: string;
  totalSeccionesUt: number;
  afinidad: number;
};

function tokensSignificativos(value: string): string[] {
  const stop = new Set(["de", "del", "la", "las", "los", "el", "y", "en", "a", "pueblo", "pblo"]);
  return baseNombreTerritorial(value)
    .split(" ")
    .filter((t) => t.length > 2 && !stop.has(t));
}

function enlacesPorSeccion(uts: UtRow[], enlaces: { coloniaNombre: string; utClave: string }[]) {
  const utPorClave = new Map(uts.map((u) => [u.clave, u]));
  const porSeccion = new Map<string, EnlaceSeccion[]>();

  for (const enlace of enlaces) {
    const ut = utPorClave.get(enlace.utClave);
    if (!ut) continue;

    for (const seccion of ut.seccionesElectorales) {
      const afinidad = enlaceColoniaUtValido(enlace.coloniaNombre, ut.clave) ? 1 : 0;
      if (afinidad <= 0) continue;

      const lista = porSeccion.get(seccion) ?? [];
      lista.push({
        colonia: enlace.coloniaNombre,
        utClave: ut.clave,
        utNombre: ut.nombre,
        totalSeccionesUt: ut.seccionesElectorales.length,
        afinidad,
      });
      porSeccion.set(seccion, lista);
    }
  }

  return porSeccion;
}

/**
 * Criterio: en una sección, una colonia se descarta si otra colonia tiene mayor
 * afinidad UT y además su mejor UT es más específica (menos secciones) o empata
 * en especificidad con afinidad claramente superior.
 */
function coloniasFiltradas(enlaces: EnlaceSeccion[]): {
  aceptadas: string[];
  descartadas: { colonia: string; razon: string }[];
} {
  const porColonia = new Map<string, EnlaceSeccion>();
  for (const e of enlaces) {
    const prev = porColonia.get(e.colonia);
    if (!prev || e.afinidad > prev.afinidad) {
      porColonia.set(e.colonia, e);
    }
  }

  const candidatas = [...porColonia.entries()].map(([colonia, mejor]) => ({ colonia, mejor }));
  if (candidatas.length <= 1) {
    return {
      aceptadas: candidatas.map((c) => c.colonia),
      descartadas: [],
    };
  }

  candidatas.sort((a, b) => {
    const diffAfin = b.mejor.afinidad - a.mejor.afinidad;
    if (Math.abs(diffAfin) > 0.05) return diffAfin;
    return a.mejor.totalSeccionesUt - b.mejor.totalSeccionesUt;
  });

  const ganadora = candidatas[0];
  const aceptadas: string[] = [];
  const descartadas: { colonia: string; razon: string }[] = [];

  for (const cand of candidatas) {
    const m = cand.mejor;
    const g = ganadora.mejor;

    const mismaFamilia =
      tokensSignificativos(cand.colonia).some((t) =>
        tokensSignificativos(ganadora.colonia).includes(t),
      ) &&
      tokensSignificativos(ganadora.colonia).some((t) =>
        tokensSignificativos(cand.colonia).includes(t),
      );

    if (cand.colonia === ganadora.colonia) {
      aceptadas.push(cand.colonia);
      continue;
    }

    // Compartida legítima: afinidad alta en UT distinta y especificidad similar
    const compartidaLegitima =
      m.afinidad >= 0.85 &&
      m.totalSeccionesUt <= 12 &&
      Math.abs(m.afinidad - g.afinidad) <= 0.12;

    if (compartidaLegitima) {
      aceptadas.push(cand.colonia);
      continue;
    }

    // Descartar si afinidad baja frente a la ganadora o UT muy amplia sin respaldo
    const debil =
      m.afinidad < g.afinidad - 0.08 ||
      (m.afinidad < 0.75 && g.afinidad >= 0.75) ||
      (m.totalSeccionesUt >= 8 && m.afinidad < g.afinidad && !mismaFamilia);

    if (debil) {
      descartadas.push({
        colonia: cand.colonia,
        razon: `${m.utClave} ${m.utNombre} (afinidad ${m.afinidad.toFixed(2)} vs ${g.utClave} ${g.afinidad.toFixed(2)})`,
      });
    } else {
      aceptadas.push(cand.colonia);
    }
  }

  return { aceptadas: [...new Set(aceptadas)].sort((a, b) => a.localeCompare(b, "es")), descartadas };
}

async function main() {
  const uts = await prisma.unidadTerritorial.findMany({
    select: { clave: true, nombre: true, seccionesElectorales: true },
    orderBy: { clave: "asc" },
  });

  const enlacesDb = await prisma.coloniaUnidadTerritorial.findMany({
    include: { unidadTerritorial: { select: { clave: true } } },
  });

  const enlaces = enlacesDb.map((e) => ({
    coloniaNombre: e.coloniaNombre,
    utClave: e.unidadTerritorial.clave,
  }));

  const porSeccion = enlacesPorSeccion(uts, enlaces);

  let compartidas = 0;
  let conDescartes = 0;
  const reporte: {
    seccion: string;
    antes: string[];
    despues: string[];
    descartadas: { colonia: string; razon: string }[];
  }[] = [];

  for (const seccion of SECCIONES_ELECTORALES_COYOACAN) {
    const enlacesSec = porSeccion.get(seccion) ?? [];
    const antes = [...new Set(enlacesSec.map((e) => e.colonia))].sort((a, b) =>
      a.localeCompare(b, "es"),
    );
    if (antes.length <= 1) continue;

    compartidas += 1;
    const { aceptadas, descartadas } = coloniasFiltradas(enlacesSec);
    if (descartadas.length) {
      conDescartes += 1;
      reporte.push({ seccion, antes, despues: aceptadas, descartadas });
    }
  }

  console.log(`Secciones con 2+ colonias: ${compartidas}`);
  console.log(`Secciones con colonias descartadas por criterio: ${conDescartes}`);
  console.log("---");
  for (const r of reporte) {
    console.log(
      `${r.seccion}: ${r.antes.join(" | ")} -> ${r.despues.join(" | ")}`,
    );
    for (const d of r.descartadas) {
      console.log(`  - ${d.colonia}: ${d.razon}`);
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
