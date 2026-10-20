-- Alcance: elegir dirigentes concretos (checkboxes en admin)
ALTER TYPE "AlcanceNotificacion" ADD VALUE IF NOT EXISTS 'DIRIGENTES_SELECCION';

ALTER TABLE "Notificacion"
  ADD COLUMN IF NOT EXISTS "dirigenteIdsSeleccionados" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
