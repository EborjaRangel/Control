-- AlterTable
ALTER TABLE "ReporteServicioUrbano" ADD COLUMN "anotacionAtencion" TEXT;
ALTER TABLE "ReporteServicioUrbano" ADD COLUMN "atendidoAt" TIMESTAMP(3);

UPDATE "ReporteServicioUrbano"
SET "atendidoAt" = "estatusAt"
WHERE "estatus" = 'ATENDIDO' AND "atendidoAt" IS NULL;
