/**
 * Asigna distrito federal a dirigentes con sección electoral definida,
 * según el catálogo INE de casillas (casillas-coyoacan-2024.json).
 *
 * El distrito federal depende de la sección, no de la UT. Por defecto incluye
 * a todos los dirigentes activos con sección; usa --solo-con-ut para exigir UT.
 *
 * Uso:
 *   npx tsx scripts/update-dirigentes-distrito-federal.ts --dry-run
 *   npx tsx scripts/update-dirigentes-distrito-federal.ts --confirm
 *   npx tsx scripts/update-dirigentes-distrito-federal.ts --confirm --solo-con-ut
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { distritoFederalDeSeccion } from "../src/lib/casillas-electorales.js";

type Plan = {
  id: string;
  seccion: string;
  utClave: string | null;
  distritoActual: number | null;
  distritoNuevo: number | null;
  motivo: string;
};

function parseArgs(argv: string[]) {
  let confirm = false;
  let dryRun = false;
  let soloConUt = false;
  for (const arg of argv) {
    if (arg === "--confirm") confirm = true;
    if (arg === "--dry-run") dryRun = true;
    if (arg === "--solo-con-ut") soloConUt = true;
  }
  return { confirm, dryRun, soloConUt };
}

function normalizarSeccion(value: string): string {
  const n = Number(value.trim());
  return Number.isFinite(n) ? String(n) : value.trim();
}

async function main() {
  const { confirm, dryRun, soloConUt } = parseArgs(process.argv.slice(2));

  const dirigentes = await prisma.dirigente.findMany({
    where: {
      status: { not: "BAJA" },
      NOT: { seccionElectoral: "" },
      ...(soloConUt ? { unidadTerritorialId: { not: null } } : {}),
    },
    select: {
      id: true,
      seccionElectoral: true,
      distritoFederal: true,
      unidadTerritorial: { select: { clave: true } },
    },
    orderBy: [{ seccionElectoral: "asc" }, { id: "asc" }],
  });

  const planes: Plan[] = [];
  for (const d of dirigentes) {
    const seccion = normalizarSeccion(d.seccionElectoral);
    const distritoNuevo = distritoFederalDeSeccion(seccion);
    let motivo: string;

    if (!distritoNuevo) {
      motivo = "sección sin distrito federal en catálogo de casillas";
    } else if (d.distritoFederal === distritoNuevo) {
      motivo = "ya correcto";
    } else if (d.distritoFederal == null) {
      motivo = "asignar";
    } else {
      motivo = "corregir";
    }

    planes.push({
      id: d.id,
      seccion,
      utClave: d.unidadTerritorial?.clave ?? null,
      distritoActual: d.distritoFederal,
      distritoNuevo,
      motivo,
    });
  }

  const asignar = planes.filter((p) => p.distritoNuevo && p.motivo !== "ya correcto");
  const sinCatalogo = planes.filter((p) => !p.distritoNuevo);
  const ok = planes.filter((p) => p.motivo === "ya correcto");

  console.log(`Dirigentes con sección${soloConUt ? " + UT" : ""}: ${planes.length}`);
  console.log(`Ya con distrito federal correcto: ${ok.length}`);
  console.log(`Por actualizar: ${asignar.length}`);
  console.log(`Sin catálogo para su sección: ${sinCatalogo.length}`);

  const porDistrito = new Map<number, number>();
  for (const p of asignar) {
    if (!p.distritoNuevo) continue;
    porDistrito.set(p.distritoNuevo, (porDistrito.get(p.distritoNuevo) ?? 0) + 1);
  }
  if (porDistrito.size) {
    console.log("\nActualizaciones por distrito federal:");
    for (const [distrito, n] of [...porDistrito.entries()].sort((a, b) => a[0] - b[0])) {
      console.log(`  Distrito ${distrito}: ${n}`);
    }
  }

  console.log("\nPrimeras 8 actualizaciones:");
  for (const p of asignar.slice(0, 8)) {
    console.log(
      `  ${p.id} · sec ${p.seccion} · UT ${p.utClave ?? "—"} · ${p.distritoActual ?? "—"} → ${p.distritoNuevo} (${p.motivo})`,
    );
  }

  if (sinCatalogo.length) {
    const secciones = [...new Set(sinCatalogo.map((p) => p.seccion))].sort(
      (a, b) => Number(a) - Number(b),
    );
    console.log(`\nSecciones sin catálogo (${secciones.length}): ${secciones.slice(0, 15).join(", ")}${secciones.length > 15 ? "…" : ""}`);
  }

  if (dryRun) {
    console.log("\nDry-run: no se modificó la base de datos.");
    return;
  }

  if (!confirm) {
    throw new Error("Agrega --confirm para aplicar o --dry-run para simular.");
  }

  let actualizados = 0;
  for (const p of asignar) {
    if (!p.distritoNuevo) continue;
    await prisma.dirigente.update({
      where: { id: p.id },
      data: { distritoFederal: p.distritoNuevo },
    });
    actualizados += 1;
  }

  console.log(`\nActualizados: ${actualizados}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
