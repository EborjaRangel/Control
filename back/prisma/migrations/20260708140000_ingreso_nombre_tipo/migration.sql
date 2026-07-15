-- Renombrar campos de IngresoDirigente según formulario

ALTER TABLE "IngresoDirigente" RENAME COLUMN "derivacionComplemento" TO "nombre";
ALTER TABLE "IngresoDirigente" RENAME COLUMN "adscripcion" TO "tipo";
