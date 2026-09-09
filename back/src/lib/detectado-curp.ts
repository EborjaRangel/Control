import {
  curpRegistradaEnSistema,
  MENSAJE_CURP_DETECTADO_DUPLICADA,
  normalizarCurpSistema,
} from "./curp-sistema-detectados.js";

export async function validarCurpDetectadoDisponible(
  curpInput: string,
  excludeDetectadoId?: string,
): Promise<{ ok: true; curp: string } | { ok: false; error: string }> {
  const curp = normalizarCurpSistema(curpInput);
  if (!curp) {
    return { ok: false, error: "CURP inválida" };
  }

  const existing = await curpRegistradaEnSistema(curp, { excludeDetectadoId });
  if (existing === "detectado" || existing === "persona") {
    return { ok: false, error: MENSAJE_CURP_DETECTADO_DUPLICADA };
  }

  return { ok: true, curp };
}

export const MENSAJE_CURP_DETECTADO_DUPLICADA_EN_BD = MENSAJE_CURP_DETECTADO_DUPLICADA;
