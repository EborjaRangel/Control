-- Los detectados ya no tienen cuenta de usuario
DELETE FROM "Usuario" WHERE "rol" = 'DETECTADO';

ALTER TABLE "Detectado" DROP COLUMN IF EXISTS "metaPersonas";

ALTER TABLE "Detectado" ADD COLUMN IF NOT EXISTS "ineFrenteUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Detectado" ADD COLUMN IF NOT EXISTS "ineReversoUrl" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Usuario" DROP CONSTRAINT IF EXISTS "Usuario_detectadoId_fkey";
DROP INDEX IF EXISTS "Usuario_detectadoId_key";
ALTER TABLE "Usuario" DROP COLUMN IF EXISTS "detectadoId";
