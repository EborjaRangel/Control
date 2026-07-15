-- Alcance por distrito local y por tipo de dirigente (D1–D4)
ALTER TYPE "AlcanceEvento" ADD VALUE 'DISTRITO';
ALTER TYPE "AlcanceEvento" ADD VALUE 'TIPO_DIRIGENTE';

ALTER TABLE "EventoAsistencia" ADD COLUMN "distritoLocal" INTEGER;
ALTER TABLE "EventoAsistencia" ADD COLUMN "tipoDirigente" "TipoDirigente";

CREATE INDEX "EventoAsistencia_distritoLocal_idx" ON "EventoAsistencia"("distritoLocal");
CREATE INDEX "EventoAsistencia_tipoDirigente_idx" ON "EventoAsistencia"("tipoDirigente");
