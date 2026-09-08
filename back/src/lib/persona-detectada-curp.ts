import { prisma } from "./prisma.js";
import {
  curpRegistradaEnSistema,
  MENSAJE_CURP_DETECTADO_DUPLICADA,
  MENSAJE_CURP_PERSONA_DUPLICADA,
  normalizarCurpSistema,
} from "./curp-sistema-detectados.js";

export function normalizarCurpPersonaDetectada(input: string): string | null {
  return normalizarCurpSistema(input);
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

  const existing = await curpRegistradaEnSistema(curp, { excludePersonaId });
  if (existing === "persona") {
    return { ok: false, error: MENSAJE_CURP_PERSONA_DUPLICADA };
  }
  if (existing === "detectado") {
    return { ok: false, error: MENSAJE_CURP_DETECTADO_DUPLICADA };
  }

  return { ok: true, curp };
}

export const MENSAJE_CURP_DUPLICADA = MENSAJE_CURP_PERSONA_DUPLICADA;
