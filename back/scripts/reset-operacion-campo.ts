/**
 * Vacía en la base conectada: servicios urbanos, detectados, RC, RG y representantes de casilla.
 * No toca dirigentes, nóminas, asambleas ni asistencia.
 *
 * Los folios SU-YYYYMMDD-NNNN se regeneran desde cero al no quedar reportes.
 *
 * Uso:
 *   npx tsx scripts/reset-operacion-campo.ts --dry-run
 *   npx tsx scripts/reset-operacion-campo.ts --confirm
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

function parseArgs(argv: string[]) {
  return {
    confirm: argv.includes("--confirm"),
    dryRun: argv.includes("--dry-run"),
  };
}

async function conteos() {
  const [
    servicios,
    detectados,
    personasDetectadas,
    rcs,
    rgs,
    representantes,
    usuariosRc,
    usuariosRg,
    usuariosDetectado,
  ] = await Promise.all([
    prisma.reporteServicioUrbano.count(),
    prisma.detectado.count(),
    prisma.personaDetectada.count(),
    prisma.responsableColonia.count(),
    prisma.responsableGeneral.count(),
    prisma.representanteCasilla.count(),
    prisma.usuario.count({ where: { rol: "RC" } }),
    prisma.usuario.count({ where: { rol: "RG" } }),
    prisma.usuario.count({ where: { rol: "DETECTADO" } }),
  ]);

  return {
    servicios,
    detectados,
    personasDetectadas,
    rcs,
    rgs,
    representantes,
    usuariosRc,
    usuariosRg,
    usuariosDetectado,
  };
}

function imprimirConteos(titulo: string, c: Awaited<ReturnType<typeof conteos>>) {
  console.log(titulo);
  console.log(`  Servicios urbanos:          ${c.servicios}`);
  console.log(`  Detectados:                 ${c.detectados}`);
  console.log(`  Personas detectadas:        ${c.personasDetectadas}`);
  console.log(`  RC:                         ${c.rcs}`);
  console.log(`  RG:                         ${c.rgs}`);
  console.log(`  Representantes de casilla:  ${c.representantes}`);
  console.log(`  Usuarios RC:                ${c.usuariosRc}`);
  console.log(`  Usuarios RG:                ${c.usuariosRg}`);
  console.log(`  Usuarios DETECTADO:         ${c.usuariosDetectado}`);
}

async function main() {
  const { confirm, dryRun } = parseArgs(process.argv.slice(2));
  const host = (() => {
    try {
      return new URL(process.env.DATABASE_URL ?? "").hostname;
    } catch {
      return "desconocido";
    }
  })();

  console.log(`Base: ${host}`);
  const antes = await conteos();
  imprimirConteos("Antes:", antes);

  if (dryRun) {
    console.log("\nDry-run: no se borró nada. El siguiente folio de servicios urbanos sería SU-YYYYMMDD-0001.");
    return;
  }

  if (!confirm) {
    throw new Error("Agrega --confirm para aplicar o --dry-run para simular.");
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.personaDetectada.deleteMany();
      await tx.detectado.deleteMany();
      await tx.reporteServicioUrbano.deleteMany();
      await tx.representanteCasilla.deleteMany();
      await tx.usuario.deleteMany({
        where: {
          OR: [
            { rol: "RC" },
            { rol: "RG" },
            { rol: "DETECTADO" },
            { rcId: { not: null } },
            { rgId: { not: null } },
          ],
        },
      });
      await tx.responsableColonia.deleteMany();
      await tx.responsableGeneral.deleteMany();
    },
    { timeout: 180_000 },
  );

  const despues = await conteos();
  imprimirConteos("\nDespués:", despues);

  const quedaAlgo =
    despues.servicios +
    despues.detectados +
    despues.personasDetectadas +
    despues.rcs +
    despues.rgs +
    despues.representantes +
    despues.usuariosRc +
    despues.usuariosRg +
    despues.usuariosDetectado;

  if (quedaAlgo > 0) {
    throw new Error("Quedaron registros; revisa el vaciado.");
  }

  console.log("\nListo. Folios de servicios urbanos vuelven a 0001. Dirigentes no se tocaron.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
