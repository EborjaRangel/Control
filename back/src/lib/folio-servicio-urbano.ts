import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

function prefijoFolioDia(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `SU-${y}${m}${d}-`;
}

export async function generarFolioServicioUrbano(tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const ahora = new Date();
  const prefijo = prefijoFolioDia(ahora);
  const inicioDia = new Date(ahora);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(ahora);
  finDia.setHours(23, 59, 59, 999);

  const existentes = await client.reporteServicioUrbano.count({
    where: {
      folio: { startsWith: prefijo },
      createdAt: { gte: inicioDia, lte: finDia },
    },
  });

  return `${prefijo}${String(existentes + 1).padStart(4, "0")}`;
}
