-- CreateEnum
CREATE TYPE "EstatusReporteServicioUrbano" AS ENUM ('ENVIADO', 'RECIBIDO', 'ATENDIDO', 'DESECHADO');

-- AlterTable
ALTER TABLE "ReporteServicioUrbano" ADD COLUMN "folio" TEXT;
ALTER TABLE "ReporteServicioUrbano" ADD COLUMN "direccion" TEXT;
ALTER TABLE "ReporteServicioUrbano" ADD COLUMN "estatus" "EstatusReporteServicioUrbano" NOT NULL DEFAULT 'ENVIADO';
ALTER TABLE "ReporteServicioUrbano" ADD COLUMN "estatusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill folio and direccion for existing rows
UPDATE "ReporteServicioUrbano"
SET
  "folio" = 'SU-LEG-' || SUBSTRING("id", 1, 8),
  "direccion" = COALESCE("colonia", 'Ubicación sin dirección') || ' (' || ROUND("lat"::numeric, 5) || ', ' || ROUND("lng"::numeric, 5) || ')'
WHERE "folio" IS NULL;

ALTER TABLE "ReporteServicioUrbano" ALTER COLUMN "folio" SET NOT NULL;
ALTER TABLE "ReporteServicioUrbano" ALTER COLUMN "direccion" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ReporteServicioUrbano_folio_key" ON "ReporteServicioUrbano"("folio");
CREATE INDEX "ReporteServicioUrbano_estatus_idx" ON "ReporteServicioUrbano"("estatus");
CREATE INDEX "ReporteServicioUrbano_folio_idx" ON "ReporteServicioUrbano"("folio");
