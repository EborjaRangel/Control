/**
 * Crea o actualiza cuentas de acceso para dirigentes, RC y RG sin usuario.
 * Formato: primera letra del nombre + apellido paterno (minúsculas), contraseña 123456.
 * El administrador no se modifica.
 *
 * Uso:
 *   npx tsx scripts/provision-usuarios-dirigentes.ts --dry-run
 *   npx tsx scripts/provision-usuarios-dirigentes.ts --confirm
 *   npx tsx scripts/provision-usuarios-dirigentes.ts --confirm --reset-password
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/auth.js";
import {
  PASSWORD_DEFECTO_USUARIO,
  resolverUsernameUnico,
} from "../src/lib/credenciales-usuario.js";

function parseArgs(argv: string[]) {
  return {
    confirm: argv.includes("--confirm"),
    dryRun: argv.includes("--dry-run"),
    resetPassword: argv.includes("--reset-password"),
  };
}

type RolProvision = "DIRIGENTE" | "RC" | "RG";

type CuentaPendiente = {
  rol: RolProvision;
  nombre: string;
  primerApellido: string;
  dirigenteId?: string;
  rcId?: string;
  rgId?: string;
  etiqueta: string;
};

async function main() {
  const { confirm, dryRun, resetPassword } = parseArgs(process.argv.slice(2));

  const pendientes: CuentaPendiente[] = [];

  const dirigentes = await prisma.dirigente.findMany({
    where: { usuario: null },
    select: { id: true, nombre: true, primerApellido: true },
    orderBy: { primerApellido: "asc" },
  });
  for (const d of dirigentes) {
    pendientes.push({
      rol: "DIRIGENTE",
      nombre: d.nombre,
      primerApellido: d.primerApellido,
      dirigenteId: d.id,
      etiqueta: `Dirigente ${d.primerApellido}`,
    });
  }

  const rcs = await prisma.responsableColonia.findMany({
    where: { usuario: null },
    select: { id: true, nombre: true, primerApellido: true },
  });
  for (const rc of rcs) {
    pendientes.push({
      rol: "RC",
      nombre: rc.nombre,
      primerApellido: rc.primerApellido,
      rcId: rc.id,
      etiqueta: `RC ${rc.primerApellido}`,
    });
  }

  const rgs = await prisma.responsableGeneral.findMany({
    where: { usuario: null },
    select: { id: true, nombre: true, primerApellido: true },
  });
  for (const rg of rgs) {
    pendientes.push({
      rol: "RG",
      nombre: rg.nombre,
      primerApellido: rg.primerApellido,
      rgId: rg.id,
      etiqueta: `RG ${rg.primerApellido}`,
    });
  }

  const sinCuenta = pendientes.length;
  const usuariosNoAdmin = await prisma.usuario.count({ where: { rol: { not: "ADMIN" } } });

  console.log(`Dirigentes sin cuenta: ${dirigentes.length}`);
  console.log(`RC sin cuenta: ${rcs.length}`);
  console.log(`RG sin cuenta: ${rgs.length}`);
  console.log(`Total a provisionar: ${sinCuenta}`);
  console.log(`Usuarios no admin existentes: ${usuariosNoAdmin}`);

  if (resetPassword) {
    const aResetear = await prisma.usuario.count({ where: { rol: { not: "ADMIN" } } });
    console.log(`Con --reset-password se actualizarían ${aResetear} contraseñas a ${PASSWORD_DEFECTO_USUARIO}`);
  }

  if (dryRun) {
    console.log("\nDry-run: no se aplicaron cambios.");
    const muestra = pendientes.slice(0, 5);
    for (const p of muestra) {
      console.log(`  - ${p.etiqueta}: ${p.nombre} ${p.primerApellido}`);
    }
    if (pendientes.length > 5) {
      console.log(`  ... y ${pendientes.length - 5} más`);
    }
    return;
  }

  if (!confirm) {
    throw new Error("Agrega --confirm para aplicar o --dry-run para simular.");
  }

  let creados = 0;
  const passwordHash = await hashPassword(PASSWORD_DEFECTO_USUARIO);

  for (const cuenta of pendientes) {
    await prisma.$transaction(async (tx) => {
      const username = await resolverUsernameUnico(tx, cuenta.nombre, cuenta.primerApellido);
      await tx.usuario.create({
        data: {
          username,
          passwordHash,
          passwordPlano: PASSWORD_DEFECTO_USUARIO,
          rol: cuenta.rol,
          dirigenteId: cuenta.dirigenteId ?? null,
          rcId: cuenta.rcId ?? null,
          rgId: cuenta.rgId ?? null,
        },
      });
    });
    creados += 1;
    if (creados % 100 === 0) {
      console.log(`  ${creados}/${sinCuenta} cuentas creadas…`);
    }
  }

  let reseteados = 0;
  if (resetPassword) {
    const actualizados = await prisma.usuario.updateMany({
      where: { rol: { not: "ADMIN" } },
      data: {
        passwordHash,
        passwordPlano: PASSWORD_DEFECTO_USUARIO,
      },
    });
    reseteados = actualizados.count;
  }

  console.log(`\nListo: ${creados} cuentas nuevas.`);
  if (resetPassword) {
    console.log(`${reseteados} contraseñas restablecidas a ${PASSWORD_DEFECTO_USUARIO}.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
