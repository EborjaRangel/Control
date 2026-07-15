-- Ingresos adicionales: tipo libre + monto (otra actividad económica)

ALTER TABLE "IngresoDirigente" ADD COLUMN "tipoIngreso" TEXT;

UPDATE "IngresoDirigente" i
SET "tipoIngreso" = COALESCE(
  NULLIF(TRIM(i.nombre), ''),
  NULLIF(TRIM(i.tipo), ''),
  (SELECT c.descripcion FROM "CatalogoIngreso" c WHERE c.id = i."catalogoIngresoId")
)
WHERE "tipoIngreso" IS NULL;

UPDATE "IngresoDirigente"
SET "tipoIngreso" = 'Sin especificar'
WHERE "tipoIngreso" IS NULL OR TRIM("tipoIngreso") = '';

ALTER TABLE "IngresoDirigente" ALTER COLUMN "tipoIngreso" SET NOT NULL;

ALTER TABLE "IngresoDirigente" DROP CONSTRAINT "IngresoDirigente_catalogoIngresoId_fkey";
DROP INDEX IF EXISTS "IngresoDirigente_catalogoIngresoId_idx";
ALTER TABLE "IngresoDirigente" DROP COLUMN "catalogoIngresoId";
ALTER TABLE "IngresoDirigente" DROP COLUMN "nombre";
ALTER TABLE "IngresoDirigente" DROP COLUMN "tipo";

DROP TABLE "CatalogoIngreso";
