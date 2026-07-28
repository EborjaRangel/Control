import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma.js";
import { enviarCorreo } from "./comunicacion/email.js";

const TOKEN_TTL_MS = 60 * 60 * 1000;

export function urlPublicaApp(): string {
  return (
    process.env.PUBLIC_APP_URL?.replace(/\/$/, "") ??
    process.env.FRONTEND_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export function generarTokenRecuperacion(): string {
  return randomBytes(32).toString("hex");
}

export function hashTokenRecuperacion(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function urlRestablecerContrasena(token: string): string {
  return `${urlPublicaApp()}/login/restablecer/${encodeURIComponent(token)}`;
}

type UsuarioConCorreo = {
  id: string;
  username: string;
  rol: string;
  activo: boolean;
  dirigente: { activo: boolean; correo: string } | null;
  rc: {
    activo: boolean;
    dirigente: { correo: string } | null;
  } | null;
  rg: {
    activo: boolean;
    dirigente: { correo: string } | null;
  } | null;
};

export function normalizarCorreo(correo: string) {
  return correo.trim().toLowerCase();
}

export async function buscarUsuarioPorCorreoRegistrado(correo: string) {
  const correoNorm = normalizarCorreo(correo);

  const candidatos = await prisma.usuario.findMany({
    where: {
      OR: [
        { dirigente: { correo: { equals: correoNorm, mode: "insensitive" } } },
        { rc: { dirigente: { correo: { equals: correoNorm, mode: "insensitive" } } } },
        { rg: { dirigente: { correo: { equals: correoNorm, mode: "insensitive" } } } },
      ],
    },
    include: {
      dirigente: { select: { activo: true, correo: true } },
      rc: {
        select: {
          activo: true,
          dirigente: { select: { correo: true } },
        },
      },
      rg: {
        select: {
          activo: true,
          dirigente: { select: { correo: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    candidatos.find((usuario) => {
      const registrado = correoRegistradoUsuario(usuario);
      return registrado === correoNorm && usuarioPuedeRecuperarContrasena(usuario);
    }) ?? null
  );
}

export function correoRegistradoUsuario(usuario: UsuarioConCorreo): string | null {
  const candidatos = [
    usuario.dirigente?.correo,
    usuario.rc?.dirigente?.correo,
    usuario.rg?.dirigente?.correo,
  ];

  for (const correo of candidatos) {
    const normalizado = correo?.trim().toLowerCase();
    if (normalizado && normalizado.includes("@")) {
      return normalizado;
    }
  }

  return null;
}

export function usuarioPuedeRecuperarContrasena(usuario: UsuarioConCorreo): boolean {
  if (!usuario.activo || usuario.rol === "DETECTADO") {
    return false;
  }

  if (usuario.rol === "DIRIGENTE" && usuario.dirigente && !usuario.dirigente.activo) {
    return false;
  }

  if (usuario.rol === "RC" && usuario.rc && !usuario.rc.activo) {
    return false;
  }

  if (usuario.rol === "RG" && usuario.rg && !usuario.rg.activo) {
    return false;
  }

  return Boolean(correoRegistradoUsuario(usuario));
}

export async function crearTokenRecuperacion(usuarioId: string): Promise<string> {
  const token = generarTokenRecuperacion();
  const tokenHash = hashTokenRecuperacion(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { usuarioId, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: {
        tokenHash,
        usuarioId,
        expiresAt,
      },
    }),
  ]);

  return token;
}

export async function validarTokenRecuperacion(token: string) {
  const registro = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashTokenRecuperacion(token) },
    include: {
      usuario: {
        select: {
          id: true,
          username: true,
          activo: true,
          rol: true,
        },
      },
    },
  });

  if (!registro || registro.usedAt || registro.expiresAt < new Date()) {
    return null;
  }

  if (!registro.usuario.activo || registro.usuario.rol === "DETECTADO") {
    return null;
  }

  return registro;
}

export async function marcarTokenRecuperacionUsado(token: string) {
  await prisma.passwordResetToken.update({
    where: { tokenHash: hashTokenRecuperacion(token) },
    data: { usedAt: new Date() },
  });
}

export async function enviarCorreoRecuperacion(input: {
  to: string;
  username: string;
  token: string;
}) {
  const enlace = urlRestablecerContrasena(input.token);
  const subject = "Restablece tu contraseña — Control Coyoacán";
  const text = [
    "Recibiste este correo electrónico para restablecer tu contraseña y asignar una nueva contraseña de acceso al sistema.",
    "",
    `Usuario: ${input.username}`,
    "",
    "Para continuar, abre el siguiente enlace (válido por 1 hora):",
    enlace,
    "",
    "Si no solicitaste este cambio, ignora este mensaje.",
  ].join("\n");

  const html = `
    <p>Recibiste este <strong>correo electrónico</strong> para restablecer tu contraseña y asignar una <strong>nueva contraseña</strong> de acceso al sistema.</p>
    <p><strong>Usuario:</strong> ${input.username}</p>
    <p>Para continuar, abre el siguiente enlace (válido por 1 hora):</p>
    <p><a href="${enlace}">${enlace}</a></p>
    <p>Si no solicitaste este cambio, ignora este mensaje.</p>
  `.trim();

  return enviarCorreo({
    to: input.to,
    subject,
    text,
    html,
  });
}
