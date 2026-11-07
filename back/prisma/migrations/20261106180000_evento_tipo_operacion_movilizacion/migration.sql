-- CreateEnum
CREATE TYPE "TipoOperacionEventoAsistencia" AS ENUM ('PASE_LISTA', 'MOVILIZACION');

-- AlterTable
ALTER TABLE "EventoAsistencia" ADD COLUMN "tipoOperacion" "TipoOperacionEventoAsistencia" NOT NULL DEFAULT 'PASE_LISTA';

-- AlterTable
ALTER TABLE "RegistroAsistencia" DROP CONSTRAINT IF EXISTS "RegistroAsistencia_eventoId_dirigenteId_key";
DROP INDEX IF EXISTS "RegistroAsistencia_eventoId_dirigenteId_key";
ALTER TABLE "RegistroAsistencia" ADD COLUMN "cantidad" INTEGER NOT NULL DEFAULT 1;
CREATE INDEX "RegistroAsistencia_eventoId_dirigenteId_idx" ON "RegistroAsistencia"("eventoId", "dirigenteId");
