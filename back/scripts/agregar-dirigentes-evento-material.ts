/**
 * Agrega dirigentes a un evento de entrega de material si aún no están convocados.
 * Uso (producción): railway run npx tsx scripts/agregar-dirigentes-evento-material.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { convocarEnEventoMaterialAbiertoPorTitulo } from "../src/lib/material-convocar.js";

const TITULO_EVENTO = "LONAS";
const PERSONAS = ["Eduardo Arias", "Maria Concepcion Vazquez"];

async function main() {
  const resultado = await convocarEnEventoMaterialAbiertoPorTitulo(TITULO_EVENTO, PERSONAS);
  console.log(JSON.stringify(resultado, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
