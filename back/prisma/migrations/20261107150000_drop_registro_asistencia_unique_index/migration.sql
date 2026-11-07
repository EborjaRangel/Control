-- El índice único original se creó con CREATE UNIQUE INDEX, no como CONSTRAINT.
-- DROP CONSTRAINT en la migración anterior no lo eliminó; en movilización se requieren varios registros por dirigente.
DROP INDEX IF EXISTS "RegistroAsistencia_eventoId_dirigenteId_key";
