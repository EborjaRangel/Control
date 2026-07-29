-- Nuevo concepto de composición del sueldo: Estructura
ALTER TYPE "ConceptoSueldo" ADD VALUE IF NOT EXISTS 'ESTRUCTURA';

ALTER TABLE "Nomina" ADD COLUMN IF NOT EXISTS "totalEstructura" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "NominaResumenGlobal" ADD COLUMN IF NOT EXISTS "totalEstructura" DECIMAL(14,2) NOT NULL DEFAULT 0;

UPDATE "Nomina" n SET
  "totalEstructura" = COALESCE(s.estructura, 0),
  "totalGeneral" = COALESCE(s.total, n."totalGeneral")
FROM (
  SELECT
    c."nominaId",
    SUM(CASE WHEN c.concepto = 'ESTRUCTURA' THEN c.monto ELSE 0 END) AS estructura,
    SUM(c.monto) AS total
  FROM "Chambelan" c
  GROUP BY c."nominaId"
) s
WHERE n.id = s."nominaId";

UPDATE "NominaResumenGlobal" SET
  "totalEstructura" = COALESCE((
    SELECT SUM(n."totalEstructura")
    FROM "Nomina" n
    INNER JOIN "Dirigente" d ON d.id = n."dirigenteId"
    WHERE d."activo" = true
  ), 0),
  "totalGeneral" = COALESCE((
    SELECT SUM(n."totalGeneral")
    FROM "Nomina" n
    INNER JOIN "Dirigente" d ON d.id = n."dirigenteId"
    WHERE d."activo" = true
  ), 0),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'global';
