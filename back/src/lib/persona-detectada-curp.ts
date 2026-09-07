import { prisma } from "./prisma.js";

const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

export function normalizarCurpPersonaDetectada(input: string): string | null {
  const curp = input.trim().toUpperCase();
  if (!curp || !CURP_REGEX.test(curp)) return null;
  return curp;
}

export async function personaDetectadaConCurp(curp: string, excludePersonaId?: string) {
  return prisma.personaDetectada.findFirst({
    where: {
      curp,
      ...(excludePersonaId ? { id: { not: excludePersonaId } } : {}),
    },
  });
}

export async function validarCurpPersonaDetectadaDisponible(
  curpInput: string,
  excludePersonaId?: string,
): Promise<{ ok: true; curp: string } | { ok: false; error: string }> {
  const curp = normalizarCurpPersonaDetectada(curpInput);
  if (!curp) {
    return { ok: false, error: "CURP inválida" };
  }

  const existing = await personaDetectadaConCurp(curp, excludePersonaId);
  if (existing) {
    return {
      ok: false,
      error:
        "Esta CURP ya está registrada como persona detectada en el sistema. No se puede registrar dos veces, aunque haya sido capturada por otro dirigente.",
    };
  }

  return { ok: true, curp };
}

export const MENSAJE_CURP_DUPLICADA =
  "Esta CURP ya está registrada como persona detectada en el sistema. No se puede registrar dos veces, aunque haya sido capturada por otro dirigente.";
