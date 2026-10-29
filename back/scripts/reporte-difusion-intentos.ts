/**
 * Intentos recientes de difusión inferidos desde BD (éxitos + auditoría).
 * Los POST fallidos no se guardan salvo que queden en logs del servidor.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

function inicioDiaMexico(d: Date): Date {
  const mx = new Date(d.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
  return new Date(mx.getFullYear(), mx.getMonth(), mx.getDate());
}

async function main() {
  const hoyMx = inicioDiaMexico(new Date());
  const hace7 = new Date(hoyMx);
  hace7.setDate(hace7.getDate() - 7);

  const [campana, registrosRecientes, auditDifusion, auditBuscar] = await Promise.all([
    prisma.campanaDifusion.findFirst({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { registros: true } } },
    }),
    prisma.registroDifusion.findMany({
      where: { registradoAt: { gte: hace7 } },
      orderBy: { registradoAt: "desc" },
      take: 20,
      include: {
        dirigente: {
          select: { nombre: true, primerApellido: true, segundoApellido: true },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { entidad: { contains: "difusion", mode: "insensitive" } },
          { entidad: { contains: "Difusion", mode: "insensitive" } },
          { entidadLabel: { contains: "difus", mode: "insensitive" } },
        ],
        createdAt: { gte: hace7 },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.auditLog.findMany({
      where: {
        createdAt: { gte: hoyMx },
        OR: [
          { metadata: { path: ["path"], string_contains: "difusion" } },
          { cambios: { string_contains: "difusion" } },
        ],
      },
      take: 20,
    }),
  ]);

  const intentosHoy = await prisma.registroDifusion.count({
    where: { registradoAt: { gte: hoyMx } },
  });

  const despuesFin = campana
    ? await prisma.registroDifusion.count({
        where: {
          campanaId: campana.id,
          registradoAt: {
            gt: new Date(`${campana.fechaFin.toISOString().slice(0, 10)}T23:59:59.999Z`),
          },
        },
      })
    : 0;

  console.log("=== Difusión — intentos / errores (BD) ===\n");
  if (campana) {
    console.log(
      `Campaña: ${campana.titulo} | ${campana.estado} | fin ${campana.fechaFin.toISOString().slice(0, 10)} | total ${campana._count.registros}`,
    );
  }
  console.log(`Registros exitosos hoy (MX): ${intentosHoy}`);
  console.log(`Registros después de fecha fin (UTC fin día): ${despuesFin}`);
  console.log(`Filas en auditoría con 'difusión' (7 días): ${auditDifusion.length}`);
  if (auditBuscar.length) console.log(`Auditoría hoy con metadata difusion: ${auditBuscar.length}`);

  console.log("\n--- Últimos 20 registros exitosos (7 días) ---");
  for (const r of registrosRecientes) {
    const nom = [r.dirigente.nombre, r.dirigente.primerApellido, r.dirigente.segundoApellido]
      .filter(Boolean)
      .join(" ");
    console.log(`  ${r.registradoAt.toISOString()} | ${nom} | ${r.id}`);
  }

  if (auditDifusion.length) {
    console.log("\n--- Auditoría difusión ---");
    for (const a of auditDifusion) {
      console.log(`  ${a.createdAt.toISOString()} | ${a.accion} | ${a.entidad} | ${a.entidadLabel ?? ""}`);
    }
  }

  console.log(
    "\nNota: POST /api/difusion/registros rechazados (vigencia, foto, etc.) NO se guardan en BD ni auditoría hoy.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
