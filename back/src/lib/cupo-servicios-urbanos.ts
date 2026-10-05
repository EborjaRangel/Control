import type { EstatusReporteServicioUrbano, Prisma, TipoDirigente } from "../generated/prisma/client.js";

/** Reportes simultáneos en trámite por tipo de dirigente. */
export const CUPO_REPORTES_SERVICIO_URBANO: Record<TipoDirigente, number> = {
  D1: 5,
  D2: 3,
  D3: 2,
  D4: 2,
  TRANSVERSAL: 2,
};

const ESTATUS_EN_TRAMITE: EstatusReporteServicioUrbano[] = ["ENVIADO", "RECIBIDO"];

export function cupoReportesServicioUrbano(tipo: string) {
  if (tipo in CUPO_REPORTES_SERVICIO_URBANO) {
    return CUPO_REPORTES_SERVICIO_URBANO[tipo as TipoDirigente];
  }
  return 0;
}

export function estatusOcupaCupo(estatus: EstatusReporteServicioUrbano) {
  return estatus === "ENVIADO" || estatus === "RECIBIDO";
}

/** Un reporte ocupa cupo mientras no esté atendido ni desechado, aunque esté dado de baja. */
export const reportesEnCursoWhere = {
  estatus: { in: ESTATUS_EN_TRAMITE },
} as const;

export class CupoServicioUrbanoError extends Error {
  constructor(tipo: string, cupo: number) {
    super(
      `Cupo lleno: un dirigente ${tipo} puede tener ${cupo} reporte(s) en trámite. Se libera un espacio cuando un reporte se marca como atendido o desechado.`,
    );
    this.name = "CupoServicioUrbanoError";
  }
}

type CupoDb = {
  reporteServicioUrbano: {
    count: (args: Prisma.ReporteServicioUrbanoCountArgs) => Prisma.PrismaPromise<number>;
  };
};

export async function contarReportesEnCurso(db: CupoDb, dirigenteId: string, excluirId?: string) {
  return db.reporteServicioUrbano.count({
    where: {
      dirigenteId,
      ...reportesEnCursoWhere,
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
  });
}

export async function assertCupoDisponible(
  db: CupoDb,
  dirigente: { id: string; tipo: string },
  excluirId?: string,
) {
  const cupo = cupoReportesServicioUrbano(dirigente.tipo);
  const enCurso = await contarReportesEnCurso(db, dirigente.id, excluirId);
  if (enCurso >= cupo) {
    throw new CupoServicioUrbanoError(dirigente.tipo, cupo);
  }
}
