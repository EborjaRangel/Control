import type { prisma as prismaClient } from "./prisma.js";
import { USERNAME_REGEX } from "./auth-validation.js";

export const PASSWORD_DEFECTO_USUARIO = "123456";

type Tx = Omit<
  typeof prismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/** Primera letra del nombre + apellido paterno completo, en minúsculas sin acentos. */
export function usuarioDesdeNombreApellido(
  nombre: string,
  primerApellido: string,
): string {
  const nombreNorm = nombre
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const apellidoNorm = primerApellido
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "");

  const inicial = nombreNorm.charAt(0);
  if (!inicial || !apellidoNorm) return "";
  return `${inicial}${apellidoNorm}`;
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function resolverCredencialesCrear(input: {
  usuario?: string | null;
  password?: string | null;
  nombre: string;
  primerApellido: string;
}) {
  const generado = usuarioDesdeNombreApellido(input.nombre, input.primerApellido);
  const username = normalizeUsername(input.usuario?.trim() || generado);
  const password = input.password?.trim() || PASSWORD_DEFECTO_USUARIO;
  return { username, password, generado };
}

export async function resolverUsernameUnico(
  tx: Tx,
  nombre: string,
  primerApellido: string,
  opts?: { preferido?: string; excludeUsuarioId?: string; sufijo?: string },
): Promise<string> {
  const base =
    normalizeUsername(
      opts?.preferido?.trim() ||
        usuarioDesdeNombreApellido(nombre, primerApellido),
    ) || "";
  if (!base) {
    throw new Error("VALIDACION:Indica nombre y apellido paterno para generar el usuario");
  }
  if (!USERNAME_REGEX.test(base) && !opts?.sufijo) {
    throw new Error("VALIDACION:El usuario generado no cumple el formato requerido");
  }

  const raiz = opts?.sufijo ? `${base}${opts.sufijo}` : base;
  let candidato = raiz;
  let n = 2;

  while (true) {
    const ocupado = await tx.usuario.findFirst({
      where: {
        username: candidato,
        ...(opts?.excludeUsuarioId ? { id: { not: opts.excludeUsuarioId } } : {}),
      },
      select: { id: true },
    });
    if (!ocupado) return candidato;
    candidato = `${raiz}${n}`;
    n += 1;
  }
}
