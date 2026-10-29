/**
 * Conteo real de acciones de difusión (sin límite de mapa).
 * Uso: desde back/ con DATABASE_URL apuntando a la BD deseada:
 *   npx tsx scripts/reporte-difusion-conteo.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

function inicioDiaMexico(): Date {
  const now = new Date();
  const mx = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }),
  );
  return new Date(mx.getFullYear(), mx.getMonth(), mx.getDate());
}

async function main() {
  const inicioHoyMx = inicioDiaMexico();
  const finHoyMx = new Date(inicioHoyMx);
  finHoyMx.setDate(finHoyMx.getDate() + 1);

  const [totalGlobal, hoyMexico, campanas, ultimo] = await Promise.all([
    prisma.registroDifusion.count(),
    prisma.registroDifusion.count({
      where: {
        registradoAt: { gte: inicioHoyMx, lt: finHoyMx },
      },
    }),
    prisma.campanaDifusion.findMany({
      include: { _count: { select: { registros: true } } },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.registroDifusion.findFirst({
      orderBy: { registradoAt: "desc" },
      select: { registradoAt: true, id: true },
    }),
  ]);

  console.log("=== Difusión — conteo en BD ===");
  console.log(`Total acciones (todas las campañas): ${totalGlobal}`);
  console.log(
    `Registradas hoy (America/Mexico_City): ${hoyMexico} (desde ${inicioHoyMx.toISOString()})`,
  );
  if (ultimo) {
    console.log(`Último registro: ${ultimo.registradoAt.toISOString()} (${ultimo.id})`);
  }
  console.log("\nPor campaña:");
  for (const c of campanas) {
    console.log(
      `  - ${c.titulo} | ${c.estado} | vigencia ${c.fechaInicio.toISOString().slice(0, 10)} … ${c.fechaFin.toISOString().slice(0, 10)} | acciones: ${c._count.registros}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
