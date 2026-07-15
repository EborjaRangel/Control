-- AlterTable: código QR único por dirigente (asistencia en eventos)
ALTER TABLE "Dirigente" ADD COLUMN "codigoQr" TEXT;

UPDATE "Dirigente"
SET "codigoQr" = gen_random_uuid()::text
WHERE "codigoQr" IS NULL;

ALTER TABLE "Dirigente" ALTER COLUMN "codigoQr" SET NOT NULL;

CREATE UNIQUE INDEX "Dirigente_codigoQr_key" ON "Dirigente"("codigoQr");
