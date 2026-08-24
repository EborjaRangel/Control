/**
 * Carga resultados de alcaldía y casillas desde JSON local hacia PostgreSQL.
 * Uso: npm run electoral:seed-db -w control-back
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import {
  leerCasillasDesdeArchivo,
  invalidarCacheCasillasCoyoacan,
} from "../src/lib/casillas-electorales.js";
import {
  leerResultadosAlcaldiaDesdeArchivo,
  invalidarCacheResultadosAlcaldia,
} from "../src/lib/resultados-alcaldia-iecm.js";
import type { Prisma } from "../src/generated/prisma/client.js";

function cargoDeAnio(anio: number) {
  return anio === 2015 ? "Jefe delegacional" : "Alcalde";
}

async function seedResultados() {
  const dataset = leerResultadosAlcaldiaDesdeArchivo();
  const anios = (["2015", "2018", "2021", "2024"] as const).filter(
    (anio) => Object.keys(dataset[anio]?.porSeccion ?? {}).length > 0,
  );
  if (!anios.length) {
    console.warn("Sin JSON de resultados de alcaldía; no se sembraron procesos.");
    return { procesos: 0, secciones: 0 };
  }

  let secciones = 0;
  for (const clave of anios) {
    const bloque = dataset[clave]!;
    const anio = bloque.anio;
    const generadoEn = bloque.generadoEn ? new Date(bloque.generadoEn) : new Date();
    const filas = Object.entries(bloque.porSeccion).map(([seccion, info]) => ({
      id: `${anio}_${seccion}`,
      anio,
      seccion,
      listaNominal: info.listaNominal,
      votacionTotal: info.votacionTotal,
      participacionPct: info.participacionPct,
      votosNulos: info.votosNulos,
      votosNulosPct: info.votosNulosPct,
      partidos: info.partidos as Prisma.InputJsonValue,
      updatedAt: new Date(),
    }));

    await prisma.$transaction(async (tx) => {
      await tx.resultadoAlcaldiaProceso.upsert({
        where: { anio },
        create: {
          anio,
          cargo: cargoDeAnio(anio),
          fuente: bloque.fuente,
          urlFuente: bloque.urlFuente,
          generadoEn,
        },
        update: {
          cargo: cargoDeAnio(anio),
          fuente: bloque.fuente,
          urlFuente: bloque.urlFuente,
          generadoEn,
        },
      });
      await tx.resultadoAlcaldiaSeccion.deleteMany({ where: { anio } });
      if (filas.length) {
        await tx.resultadoAlcaldiaSeccion.createMany({ data: filas });
      }
    });
    secciones += filas.length;
    console.log(`Resultados ${anio}: ${filas.length} secciones`);
  }

  invalidarCacheResultadosAlcaldia();
  return { procesos: anios.length, secciones };
}

async function seedCasillas() {
  const dataset = leerCasillasDesdeArchivo();
  if (!dataset?.totalCasillas) {
    console.warn("Sin JSON de casillas; no se sembró el catálogo.");
    return { casillas: 0 };
  }

  const catalogoId = dataset.vigencia || "2024";
  const filas = Object.values(dataset.porSeccion).flatMap((info) =>
    info.casillas.map((casilla) => ({
      id: casilla.id,
      catalogoId,
      seccion: casilla.seccion,
      numero: casilla.numero,
      tipo: casilla.tipo,
      tipoLabel: casilla.tipoLabel,
      extContigua: casilla.extContigua,
      listaNominal: casilla.listaNominal,
      distritoFederal: casilla.distritoFederal,
    })),
  );
  const generadoEn = dataset.generadoEn ? new Date(dataset.generadoEn) : new Date();

  await prisma.$transaction(async (tx) => {
    await tx.casillaElectoralCatalogo.upsert({
      where: { id: catalogoId },
      create: {
        id: catalogoId,
        vigencia: dataset.vigencia,
        fuente: dataset.fuente,
        urlFuente: dataset.urlFuente,
        generadoEn,
        totalCasillas: dataset.totalCasillas,
        totalSecciones: dataset.totalSecciones,
      },
      update: {
        vigencia: dataset.vigencia,
        fuente: dataset.fuente,
        urlFuente: dataset.urlFuente,
        generadoEn,
        totalCasillas: dataset.totalCasillas,
        totalSecciones: dataset.totalSecciones,
      },
    });
    await tx.casillaElectoral.deleteMany({ where: { catalogoId } });
    if (filas.length) {
      await tx.casillaElectoral.createMany({ data: filas });
    }
  });

  invalidarCacheCasillasCoyoacan();
  console.log(`Casillas ${catalogoId}: ${filas.length} registros`);
  return { casillas: filas.length };
}

async function main() {
  const resultados = await seedResultados();
  const casillas = await seedCasillas();
  console.log(
    `Listo. Procesos=${resultados.procesos} secciones-resultado=${resultados.secciones} casillas=${casillas.casillas}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
