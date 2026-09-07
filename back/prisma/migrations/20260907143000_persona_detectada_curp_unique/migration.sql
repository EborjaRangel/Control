-- DropIndex
DROP INDEX IF EXISTS "PersonaDetectada_curp_idx";

-- CreateIndex
CREATE UNIQUE INDEX "PersonaDetectada_curp_key" ON "PersonaDetectada"("curp");
