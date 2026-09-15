-- Referencia formal al usuario que tomó cada asistencia
UPDATE "RegistroAsistencia"
SET "registradoPorId" = NULL
WHERE "registradoPorId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Usuario" AS u WHERE u."id" = "RegistroAsistencia"."registradoPorId"
  );

CREATE INDEX "RegistroAsistencia_registradoPorId_idx" ON "RegistroAsistencia"("registradoPorId");

ALTER TABLE "RegistroAsistencia"
ADD CONSTRAINT "RegistroAsistencia_registradoPorId_fkey"
FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
