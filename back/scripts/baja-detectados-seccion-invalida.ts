/**
 * Da de baja detectados activos cuya sección no corresponde al dirigente (D2–D4).
 * También incluye detectados con sección electoral inválida o vacía.
 *
 * Uso:
 *   npx tsx scripts/baja-detectados-seccion-invalida.ts --dry-run
 *   npx tsx scripts/baja-detectados-seccion-invalida.ts --confirm
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { dirigenteCapturaSoloSuSeccion } from "../src/lib/dirigente-seccion-captura.js";
import { esSeccionValida } from "../src/lib/secciones-electorales.js";

function parseArgs(argv: string[]) {
  return {
    confirm: argv.includes("--confirm"),
    dryRun: argv.includes("--dry-run"),
  };
}

function nombreCompleto(row: {
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
}) {
  return [row.nombre, row.primerApellido, row.segundoApellido].filter(Boolean).join(" ");
}

function motivoSeccionInvalida(row: {
  seccionElectoral: string;
  dirigente: { tipo: string; seccionElectoral: string; nombre: string; primerApellido: string; segundoApellido: string | null };
}): string | null {
  const seccion = row.seccionElectoral.trim();
  if (!seccion) {
    return "detectado sin sección electoral";
  }
  if (!esSeccionValida(seccion)) {
    return `sección electoral inválida (${seccion})`;
  }
  if (
    dirigenteCapturaSoloSuSeccion(row.dirigente.tipo) &&
    seccion !== row.dirigente.seccionElectoral.trim()
  ) {
    return `dirigente ${row.dirigente.tipo} sección ${row.dirigente.seccionElectoral}, detectado en ${seccion}`;
  }
  return null;
}

async function main() {
  const { confirm, dryRun } = parseArgs(process.argv.slice(2));
  if (!confirm && !dryRun) {
    throw new Error("Agrega --confirm para aplicar o --dry-run para simular.");
  }

  const detectados = await prisma.detectado.findMany({
    where: { activo: true },
    select: {
      id: true,
      seccionElectoral: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
      dirigente: {
        select: {
          id: true,
          tipo: true,
          seccionElectoral: true,
          nombre: true,
          primerApellido: true,
          segundoApellido: true,
        },
      },
      _count: { select: { personas: { where: { activo: true } } } },
    },
    orderBy: [{ seccionElectoral: "asc" }, { primerApellido: "asc" }],
  });

  const invalidos = detectados
    .map((row) => ({ row, motivo: motivoSeccionInvalida(row) }))
    .filter((item): item is { row: (typeof detectados)[number]; motivo: string } => item.motivo !== null);

  console.log(`Detectados activos: ${detectados.length}`);
  console.log(`Con sección inválida para su dirigente: ${invalidos.length}`);

  if (invalidos.length === 0) {
    console.log("Nada que dar de baja.");
    return;
  }

  for (const { row, motivo } of invalidos) {
    console.log(
      `- ${nombreCompleto(row)} | detectado ${row.seccionElectoral || "—"} | dirigente ${nombreCompleto(row.dirigente)} (${row.dirigente.tipo}, sección ${row.dirigente.seccionElectoral || "—"}) | ${row._count.personas} personas | ${motivo}`,
    );
  }

  if (dryRun) {
    console.log("\nDry-run: no se aplicaron cambios.");
    return;
  }

  const ids = invalidos.map(({ row }) => row.id);
  const personasActivas = invalidos.reduce((sum, { row }) => sum + row._count.personas, 0);

  const result = await prisma.$transaction([
    prisma.personaDetectada.updateMany({
      where: { detectadoId: { in: ids }, activo: true },
      data: { activo: false },
    }),
    prisma.detectado.updateMany({
      where: { id: { in: ids } },
      data: { activo: false },
    }),
  ]);

  console.log(`\nPersonas dadas de baja: ${result[0].count} (estimado ${personasActivas})`);
  console.log(`Detectados dados de baja: ${result[1].count}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
