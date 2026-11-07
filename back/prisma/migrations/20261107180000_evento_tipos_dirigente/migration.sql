ALTER TABLE "EventoAsistencia" ADD COLUMN "tiposDirigente" "TipoDirigente"[] NOT NULL DEFAULT ARRAY[]::"TipoDirigente"[];

UPDATE "EventoAsistencia"
SET "tiposDirigente" = ARRAY["tipoDirigente"]::"TipoDirigente"[]
WHERE "alcance" = 'TIPO_DIRIGENTE' AND "tipoDirigente" IS NOT NULL;
