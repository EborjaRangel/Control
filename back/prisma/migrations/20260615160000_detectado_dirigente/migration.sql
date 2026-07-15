-- Meta de detectados por dirigente
ALTER TABLE "Dirigente" ADD COLUMN "metaDetectados" INTEGER NOT NULL DEFAULT 0;

-- Vincular detectados a un dirigente
ALTER TABLE "Detectado" ADD COLUMN "dirigenteId" TEXT;

-- Asignar detectados existentes al primer dirigente activo (si hay datos previos)
UPDATE "Detectado" d
SET "dirigenteId" = (
  SELECT id FROM "Dirigente"
  WHERE activo = true
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE d."dirigenteId" IS NULL
  AND EXISTS (SELECT 1 FROM "Dirigente" WHERE activo = true);

ALTER TABLE "Detectado" ALTER COLUMN "dirigenteId" SET NOT NULL;

CREATE INDEX "Detectado_dirigenteId_idx" ON "Detectado"("dirigenteId");

ALTER TABLE "Detectado" ADD CONSTRAINT "Detectado_dirigenteId_fkey"
  FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
