-- Libera CURP en registros dados de baja para permitir alta nueva con la misma CURP.
UPDATE "Detectado" SET "curp" = NULL WHERE "activo" = false AND "curp" IS NOT NULL;
UPDATE "PersonaDetectada" SET "curp" = NULL WHERE "activo" = false AND "curp" IS NOT NULL;
