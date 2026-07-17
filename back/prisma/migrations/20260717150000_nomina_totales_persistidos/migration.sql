-- Totales por concepto en cada nómina
ALTER TABLE "Nomina" ADD COLUMN "totalBase" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Nomina" ADD COLUMN "totalHonorarios" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Nomina" ADD COLUMN "totalCossoc" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Nomina" ADD COLUMN "totalSetentaTreinta" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Nomina" ADD COLUMN "totalPf" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Nomina" ADD COLUMN "totalNomina8" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Nomina" ADD COLUMN "totalGeneral" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Backfill desde líneas de composición
UPDATE "Nomina" n SET
  "totalBase" = COALESCE(s.base, 0),
  "totalHonorarios" = COALESCE(s.honorarios, 0),
  "totalCossoc" = COALESCE(s.cossoc, 0),
  "totalSetentaTreinta" = COALESCE(s.setenta_treinta, 0),
  "totalPf" = COALESCE(s.pf, 0),
  "totalNomina8" = COALESCE(s.nomina_8, 0),
  "totalGeneral" = COALESCE(s.total, 0)
FROM (
  SELECT
    c."nominaId",
    SUM(CASE WHEN c.concepto = 'BASE' THEN c.monto ELSE 0 END) AS base,
    SUM(CASE WHEN c.concepto = 'HONORARIOS' THEN c.monto ELSE 0 END) AS honorarios,
    SUM(CASE WHEN c.concepto = 'COSSOC' THEN c.monto ELSE 0 END) AS cossoc,
    SUM(CASE WHEN c.concepto = 'SETENTA_TREINTA' THEN c.monto ELSE 0 END) AS setenta_treinta,
    SUM(CASE WHEN c.concepto = 'PF' THEN c.monto ELSE 0 END) AS pf,
    SUM(CASE WHEN c.concepto = 'NOMINA_8' THEN c.monto ELSE 0 END) AS nomina_8,
    SUM(c.monto) AS total
  FROM "Chambelan" c
  GROUP BY c."nominaId"
) s
WHERE n.id = s."nominaId";

-- Resumen global persistido
CREATE TABLE "NominaResumenGlobal" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "totalBase" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalHonorarios" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalCossoc" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalSetentaTreinta" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalPf" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalNomina8" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "totalGeneral" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "nominasActivas" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NominaResumenGlobal_pkey" PRIMARY KEY ("id")
);

INSERT INTO "NominaResumenGlobal" (
  "id",
  "totalBase",
  "totalHonorarios",
  "totalCossoc",
  "totalSetentaTreinta",
  "totalPf",
  "totalNomina8",
  "totalGeneral",
  "nominasActivas",
  "updatedAt"
)
SELECT
  'global',
  COALESCE(SUM(n."totalBase"), 0),
  COALESCE(SUM(n."totalHonorarios"), 0),
  COALESCE(SUM(n."totalCossoc"), 0),
  COALESCE(SUM(n."totalSetentaTreinta"), 0),
  COALESCE(SUM(n."totalPf"), 0),
  COALESCE(SUM(n."totalNomina8"), 0),
  COALESCE(SUM(n."totalGeneral"), 0),
  COUNT(*)::INTEGER,
  CURRENT_TIMESTAMP
FROM "Nomina" n
INNER JOIN "Dirigente" d ON d.id = n."dirigenteId"
WHERE d."activo" = true;
