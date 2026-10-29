import type { Prisma } from "../generated/prisma/client.js";

type Tx = Prisma.TransactionClient;

export function numeroDesdeIdLegacy(id: string): number | null {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
  return n;
}

export function numeroDirigenteVisible(d: {
  id: string;
  numeroFicha?: number | null;
}): number | null {
  if (d.numeroFicha != null) return d.numeroFicha;
  return numeroDesdeIdLegacy(d.id);
}

export function etiquetaNumeroDirigente(d: {
  id: string;
  numeroFicha?: number | null;
}): string {
  const n = numeroDirigenteVisible(d);
  return n != null ? String(n) : d.id;
}

export async function maxNumeroFichaEnUso(tx: Tx): Promise<number> {
  const agg = await tx.dirigente.aggregate({ _max: { numeroFicha: true } });
  let max = agg._max.numeroFicha ?? 0;

  const ids = await tx.dirigente.findMany({ select: { id: true } });
  for (const row of ids) {
    const legacy = numeroDesdeIdLegacy(row.id);
    if (legacy != null && legacy > max) max = legacy;
  }

  return max;
}

export async function reservarSiguienteNumeroFicha(tx: Tx): Promise<number> {
  const max = await maxNumeroFichaEnUso(tx);
  return max + 1;
}

export async function whereDirigentePorNumeroOId(
  entrada: string,
): Promise<{ id: string } | { numeroFicha: number } | null> {
  const trimmed = entrada.trim();
  if (!trimmed) return null;

  const comoNumero = Number(trimmed);
  if (Number.isFinite(comoNumero) && comoNumero > 0 && Number.isInteger(comoNumero)) {
    return { numeroFicha: comoNumero };
  }

  return { id: trimmed };
}
