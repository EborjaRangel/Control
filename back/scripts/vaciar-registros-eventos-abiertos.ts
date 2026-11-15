/**
 * Producción: railway run --service Control npx tsx scripts/vaciar-registros-eventos-abiertos.ts
 * Vacía escaneos de todos los eventos ABIERTO (deja el evento abierto para mañana).
 */
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const abiertos = await prisma.eventoAsistencia.findMany({
    where: { estado: "ABIERTO" },
    select: { id: true, titulo: true },
  });

  if (abiertos.length === 0) {
    console.log("No hay eventos con pase abierto.");
    return;
  }

  for (const ev of abiertos) {
    const antes = await prisma.registroAsistencia.count({ where: { eventoId: ev.id } });
    const { count } = await prisma.registroAsistencia.deleteMany({ where: { eventoId: ev.id } });
    console.log(`[${ev.titulo}] eliminados ${count} de ${antes} registros (evento sigue ABIERTO).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());