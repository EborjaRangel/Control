import type { prisma as prismaClient } from "./prisma.js";
import type { DesgloseSueldo } from "./composicion-sueldo.js";
import { calcularSueldo, type ConceptoComposicionInput } from "./composicion-sueldo.js";

type Tx = Omit<
  typeof prismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

function n(value: unknown): number {
  return value == null ? 0 : Number(value.toString());
}

export function desgloseToNominaTotals(desglose: DesgloseSueldo) {
  return {
    totalBase: desglose.BASE,
    totalHonorarios: desglose.HONORARIOS,
    totalCossoc: desglose.COSSOC,
    totalSetentaTreinta: desglose.SETENTA_TREINTA,
    totalPf: desglose.PF,
    totalNomina8: desglose.NOMINA_8,
    totalGeneral: desglose.total,
  };
}

export function calcularTotalesNomina(conceptos: ConceptoComposicionInput[]) {
  return desgloseToNominaTotals(calcularSueldo(conceptos));
}

export async function recalcularResumenGlobalNomina(tx: Tx) {
  const agg = await tx.nomina.aggregate({
    where: { dirigente: { activo: true } },
    _sum: {
      totalBase: true,
      totalHonorarios: true,
      totalCossoc: true,
      totalSetentaTreinta: true,
      totalPf: true,
      totalNomina8: true,
      totalGeneral: true,
    },
    _count: true,
  });

  return tx.nominaResumenGlobal.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      totalBase: n(agg._sum.totalBase),
      totalHonorarios: n(agg._sum.totalHonorarios),
      totalCossoc: n(agg._sum.totalCossoc),
      totalSetentaTreinta: n(agg._sum.totalSetentaTreinta),
      totalPf: n(agg._sum.totalPf),
      totalNomina8: n(agg._sum.totalNomina8),
      totalGeneral: n(agg._sum.totalGeneral),
      nominasActivas: agg._count,
    },
    update: {
      totalBase: n(agg._sum.totalBase),
      totalHonorarios: n(agg._sum.totalHonorarios),
      totalCossoc: n(agg._sum.totalCossoc),
      totalSetentaTreinta: n(agg._sum.totalSetentaTreinta),
      totalPf: n(agg._sum.totalPf),
      totalNomina8: n(agg._sum.totalNomina8),
      totalGeneral: n(agg._sum.totalGeneral),
      nominasActivas: agg._count,
    },
  });
}

export function serializeResumenGlobal(row: {
  totalBase: unknown;
  totalHonorarios: unknown;
  totalCossoc: unknown;
  totalSetentaTreinta: unknown;
  totalPf: unknown;
  totalNomina8: unknown;
  totalGeneral: unknown;
  nominasActivas: number;
  updatedAt: Date;
}) {
  const desglose: DesgloseSueldo = {
    BASE: n(row.totalBase),
    HONORARIOS: n(row.totalHonorarios),
    COSSOC: n(row.totalCossoc),
    SETENTA_TREINTA: n(row.totalSetentaTreinta),
    PF: n(row.totalPf),
    NOMINA_8: n(row.totalNomina8),
    total: n(row.totalGeneral),
  };

  return {
    desglose,
    nominasActivas: row.nominasActivas,
    updatedAt: row.updatedAt.toISOString(),
  };
}
