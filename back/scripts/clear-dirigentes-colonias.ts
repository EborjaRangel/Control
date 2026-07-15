/**
 * Limpia campos de dirección/contacto pendientes en todos los dirigentes
 * para que cada registro se complete desde el front.
 *
 * Uso: npx tsx scripts/clear-dirigentes-colonias.ts --confirm
 *      npx tsx scripts/clear-dirigentes-colonias.ts --dry-run
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

function parseArgs(argv: string[]) {
  return {
    confirm: argv.includes("--confirm"),
    dryRun: argv.includes("--dry-run"),
  };
}

async function main() {
  const { confirm, dryRun } = parseArgs(process.argv.slice(2));
  const total = await prisma.dirigente.count();
  const conColonia = await prisma.dirigente.count({
    where: { NOT: { colonia: "" } },
  });
  const conSeccion = await prisma.dirigente.count({
    where: { NOT: { seccionElectoral: "" } },
  });
  const conTelefono = await prisma.dirigente.count({
    where: { NOT: { telefonoCelular: "" } },
  });

  console.log(`Dirigentes en BD: ${total}`);
  console.log(`Con colonia distinta de vacío: ${conColonia}`);
  console.log(`Con sección distinta de vacío: ${conSeccion}`);
  console.log(`Con teléfono distinto de vacío: ${conTelefono}`);

  if (dryRun) {
    console.log(
      "\nDry-run: se pondrían colonia=\"\", codigoPostal=\"\", seccionElectoral=\"\", telefonoCelular=\"\", unidadTerritorialId=null en todos.",
    );
    return;
  }

  if (!confirm) {
    throw new Error("Agrega --confirm para aplicar o --dry-run para simular.");
  }

  const result = await prisma.dirigente.updateMany({
    data: {
      colonia: "",
      codigoPostal: "",
      seccionElectoral: "",
      telefonoCelular: "",
      unidadTerritorialId: null,
    },
  });

  console.log(`\nActualizados: ${result.count}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
