import { prisma } from "./prisma.js";

export const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

export function normalizarCurpSistema(input: string): string | null {
  const curp = input.trim().toUpperCase();
  if (!curp || !CURP_REGEX.test(curp)) return null;
  return curp;
}

export async function curpRegistradaEnSistema(
  curp: string,
  options?: { excludeDetectadoId?: string; excludePersonaId?: string },
): Promise<"detectado" | "persona" | null> {
  const detectado = await prisma.detectado.findFirst({
    where: {
      curp,
      ...(options?.excludeDetectadoId ? { id: { not: options.excludeDetectadoId } } : {}),
    },
    select: { id: true },
  });
  if (detectado) return "detectado";

  const persona = await prisma.personaDetectada.findFirst({
    where: {
      curp,
      ...(options?.excludePersonaId ? { id: { not: options.excludePersonaId } } : {}),
    },
    select: { id: true },
  });
  if (persona) return "persona";

  return null;
}

export const MENSAJE_CURP_DETECTADO_DUPLICADA =
  "Esa CURP ya existe. Imposible duplicar un detectado.";

export const MENSAJE_CURP_PERSONA_DUPLICADA =
  "Esta CURP ya está registrada como persona detectada en el sistema. No se puede registrar dos veces, aunque haya sido capturada por otro dirigente.";
