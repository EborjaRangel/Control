-- AlterTable
ALTER TABLE "Detectado" ADD COLUMN "curp" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Detectado_curp_key" ON "Detectado"("curp");
