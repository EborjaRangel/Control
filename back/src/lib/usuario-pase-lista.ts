import { prisma } from "./prisma.js";
import { verifyPassword } from "./auth.js";

/** Resuelve operador PASE_LISTA por clave (texto plano primero, luego bcrypt). */
export async function usuarioPaseListaPorClave(clave: string) {
  const key = clave.trim();
  if (!key) return null;

  const usuarios = await prisma.usuario.findMany({
    where: { rol: "PASE_LISTA", activo: true },
    select: { id: true, passwordHash: true, passwordPlano: true },
    take: 48,
  });

  for (const usuario of usuarios) {
    if (usuario.passwordPlano && usuario.passwordPlano === key) return usuario;
  }

  for (const usuario of usuarios) {
    if (await verifyPassword(key, usuario.passwordHash)) return usuario;
  }

  return null;
}