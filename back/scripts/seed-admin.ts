/**
 * Crea el usuario administrador inicial si no existe.
 * Uso: npm run db:seed -w control-back
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/auth.js";

async function main() {
  const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "admin123";

  const existing = await prisma.usuario.findUnique({ where: { username } });
  if (existing) {
    console.log(`Administrador "${username}" ya existe.`);
    return;
  }

  await prisma.usuario.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      rol: "ADMIN",
    },
  });

  console.log(`Administrador creado: ${username}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn("Contraseña por defecto: admin123 — cámbiala en producción.");
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
