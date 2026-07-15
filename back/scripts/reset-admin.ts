/**
 * Crea o restablece el usuario administrador.
 * Uso: npm run db:reset-admin -w control-back
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/auth.js";

async function main() {
  const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin123";

  const passwordHash = await hashPassword(password);

  const usuario =   await prisma.usuario.upsert({
    where: { username },
    create: {
      username,
      passwordHash,
      passwordPlano: password,
      rol: "ADMIN",
      activo: true,
    },
    update: {
      passwordHash,
      passwordPlano: password,
      rol: "ADMIN",
      activo: true,
    },
  });

  console.log(`Administrador listo para acceder:`);
  console.log(`  Usuario: ${usuario.username}`);
  console.log(`  Contraseña: ${password}`);
  console.log(`  Login: http://localhost:3000/login`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
