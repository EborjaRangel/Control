import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const envios = await prisma.envioComunicacion.findMany({
    orderBy: { enviadoAt: "desc" },
    take: 30,
    include: {
      dirigente: {
        select: { nombre: true, primerApellido: true, telefonoCelular: true, correo: true },
      },
      evento: { select: { titulo: true, alcance: true } },
    },
  });

  console.log(`Últimos envíos convocatoria: ${envios.length}\n`);
  for (const e of envios) {
    console.log(
      [
        e.enviadoAt.toISOString().slice(0, 16),
        e.canal,
        e.estado,
        e.destino || "—",
        e.error || "",
        `${e.dirigente.primerApellido} tel:${e.dirigente.telefonoCelular || "—"}`,
        e.evento.titulo,
      ].join(" | "),
    );
  }

  const total = await prisma.dirigente.count({ where: { activo: true } });
  const conTel = await prisma.dirigente.count({
    where: { activo: true, NOT: { telefonoCelular: "" } },
  });
  console.log(`\nDirigentes activos: ${total}, con celular: ${conTel}`);

  const eventos = await prisma.eventoAsistencia.findMany({
    where: { estado: "ACTIVO" },
    orderBy: { fecha: "desc" },
    take: 5,
    select: { id: true, titulo: true, alcance: true, colonia: true, seccionElectoral: true },
  });
  console.log("\nEventos activos:");
  for (const ev of eventos) {
    console.log(`  ${ev.titulo} | ${ev.alcance} | ${ev.colonia ?? ev.seccionElectoral ?? "—"}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
