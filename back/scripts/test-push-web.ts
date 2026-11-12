/**
 * Prueba envío push (producción): railway run npx tsx scripts/test-push-web.ts [usuario] [mensaje]
 */
import { prisma } from "../src/lib/prisma.js";
import { enviarPushWebAUsuarios } from "../src/lib/push-web.js";

const usernameArg = process.argv[2]?.trim().toLowerCase();
const mensaje = (process.argv[3] ?? "PRUEBA PUSH — Control AXIS").trim();

async function main() {
  let usuarioId: string | null = null;
  let username = usernameArg;

  if (usernameArg) {
    const u = await prisma.usuario.findUnique({
      where: { username: usernameArg },
      select: { id: true, username: true, activo: true },
    });
    if (!u?.activo) {
      console.error(`Usuario no encontrado o inactivo: ${usernameArg}`);
      process.exit(1);
    }
    usuarioId = u.id;
    username = u.username;
  } else {
    const sub = await prisma.pushSubscription.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { usuarioId: true, usuario: { select: { username: true } } },
    });
    if (!sub) {
      console.error("No hay suscripciones push. Activa avisos en el teléfono (web app) primero.");
      process.exit(1);
    }
    usuarioId = sub.usuarioId;
    username = sub.usuario.username;
  }

  const subs = await prisma.pushSubscription.count({ where: { usuarioId: usuarioId! } });
  console.log(`Enviando a ${username} (${subs} dispositivo(s) suscrito(s))…`);

  const resultado = await enviarPushWebAUsuarios({
    usuarioIds: [usuarioId!],
    mensaje,
  });

  console.log(JSON.stringify(resultado, null, 2));
  if (resultado.enviados === 0) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
