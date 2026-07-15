import type { Prisma } from "../generated/prisma/client.js";
import type { prisma as prismaClient } from "./prisma.js";
import type { ConceptoSueldo } from "./composicion-sueldo.js";

export const nominaInclude = {
  conceptos: true,
} as const;

export type NominaPayload = {
  conceptosComposicion?: {
    concepto: ConceptoSueldo;
    monto: number;
    nombre?: string | null;
    tipoDetalle?: string | null;
  }[];
};

type Tx = Omit<
  typeof prismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

function mapConceptos(data: NominaPayload) {
  return (data.conceptosComposicion ?? []).map((c) => ({
    concepto: c.concepto,
    monto: c.monto,
    nombre: c.nombre?.trim() || null,
    tipoDetalle: c.tipoDetalle?.trim() || null,
  }));
}

function legacySync(conceptos: ReturnType<typeof mapConceptos>) {
  const honorarios = conceptos
    .filter((c) => c.concepto === "HONORARIOS" || c.concepto === "BASE")
    .reduce((s, c) => s + Number(c.monto), 0);
  const cossoc = conceptos
    .filter((c) => c.concepto === "COSSOC")
    .reduce((s, c) => s + Number(c.monto), 0);
  return {
    sueldoBase: honorarios,
    enProgramaSocial: cossoc > 0,
    programaMonto: cossoc,
  };
}

export function nominaCreateData(data: NominaPayload): Prisma.NominaCreateWithoutDirigenteInput {
  const conceptos = mapConceptos(data);
  return {
    ...legacySync(conceptos),
    conceptos: {
      create: conceptos,
    },
  };
}

export async function upsertNomina(
  tx: Tx,
  dirigenteId: string,
  data: NominaPayload,
) {
  const conceptos = mapConceptos(data);
  const core = legacySync(conceptos);

  const nomina = await tx.nomina.upsert({
    where: { dirigenteId },
    create: {
      dirigenteId,
      ...core,
      ...(conceptos.length > 0 ? { conceptos: { create: conceptos } } : {}),
    },
    update: core,
  });

  await tx.chambelan.deleteMany({ where: { nominaId: nomina.id } });
  if (conceptos.length > 0) {
    await tx.chambelan.createMany({
      data: conceptos.map((c) => ({ ...c, nominaId: nomina.id })),
    });
  }

  return tx.nomina.findUniqueOrThrow({
    where: { id: nomina.id },
    include: nominaInclude,
  });
}

export async function ensureNomina(tx: Tx, dirigenteId: string) {
  const existing = await tx.nomina.findUnique({ where: { dirigenteId } });
  if (existing) return existing;
  return tx.nomina.create({
    data: { dirigenteId },
    include: nominaInclude,
  });
}
