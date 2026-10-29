-- AlterTable
ALTER TABLE "Dirigente" ADD COLUMN "numeroFicha" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Dirigente_numeroFicha_key" ON "Dirigente"("numeroFicha");
