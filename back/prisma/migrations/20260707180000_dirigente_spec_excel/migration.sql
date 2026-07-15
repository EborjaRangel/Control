-- Esquema de dirigentes alineado a "analisis de datos y campos para base de dirigentes.xlsx"

CREATE TYPE "StatusDirigente" AS ENUM ('ACTIVO', 'INACTIVO', 'BLOQUEADO', 'BAJA');

ALTER TABLE "Dirigente" ADD COLUMN "alias" TEXT;
ALTER TABLE "Dirigente" ADD COLUMN "curp" TEXT;
ALTER TABLE "Dirigente" ADD COLUMN "tieneIne" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Dirigente" ADD COLUMN "ineFrenteUrl" TEXT;
ALTER TABLE "Dirigente" ADD COLUMN "ineReversoUrl" TEXT;
ALTER TABLE "Dirigente" ADD COLUMN "distritoFederal" INTEGER;
ALTER TABLE "Dirigente" ADD COLUMN "distritoLocal" INTEGER;
ALTER TABLE "Dirigente" ADD COLUMN "alcaldia" TEXT NOT NULL DEFAULT 'Coyoacán';
ALTER TABLE "Dirigente" ADD COLUMN "estadoRepublica" TEXT NOT NULL DEFAULT 'Ciudad de México';
ALTER TABLE "Dirigente" ADD COLUMN "filiacion" TEXT;
ALTER TABLE "Dirigente" ADD COLUMN "aspiracionCortoPlazo" TEXT;
ALTER TABLE "Dirigente" ADD COLUMN "aspiracionLargoPlazo" TEXT;
ALTER TABLE "Dirigente" ADD COLUMN "referenteId" TEXT;
ALTER TABLE "Dirigente" ADD COLUMN "antecedentesPoliticos" TEXT;
ALTER TABLE "Dirigente" ADD COLUMN "notasCoordinacion" TEXT;
ALTER TABLE "Dirigente" ADD COLUMN "status" "StatusDirigente" NOT NULL DEFAULT 'ACTIVO';

UPDATE "Dirigente" SET "status" = CASE WHEN "activo" = true THEN 'ACTIVO'::"StatusDirigente" ELSE 'BAJA'::"StatusDirigente" END;

CREATE UNIQUE INDEX "Dirigente_curp_key" ON "Dirigente"("curp");
CREATE INDEX "Dirigente_status_idx" ON "Dirigente"("status");
CREATE INDEX "Dirigente_referenteId_idx" ON "Dirigente"("referenteId");

ALTER TABLE "Dirigente" ADD CONSTRAINT "Dirigente_referenteId_fkey"
  FOREIGN KEY ("referenteId") REFERENCES "Dirigente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CatalogoIngreso" (
  "id" SERIAL NOT NULL,
  "codigo" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  CONSTRAINT "CatalogoIngreso_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogoIngreso_codigo_key" ON "CatalogoIngreso"("codigo");
CREATE INDEX "CatalogoIngreso_descripcion_idx" ON "CatalogoIngreso"("descripcion");

INSERT INTO "CatalogoIngreso" ("codigo", "descripcion") VALUES
  ('BASE', 'Base'),
  ('COSSOC', 'COSSOC'),
  ('HONORARIOS', 'Honorarios'),
  ('70-30', '70-30'),
  ('NOM8', 'Nom8'),
  ('PF', 'PF');

CREATE TABLE "IngresoDirigente" (
  "id" TEXT NOT NULL,
  "dirigenteId" TEXT NOT NULL,
  "catalogoIngresoId" INTEGER NOT NULL,
  "derivacionComplemento" TEXT,
  "adscripcion" TEXT,
  "monto" DECIMAL(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT "IngresoDirigente_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "IngresoDirigente_dirigenteId_idx" ON "IngresoDirigente"("dirigenteId");
CREATE INDEX "IngresoDirigente_catalogoIngresoId_idx" ON "IngresoDirigente"("catalogoIngresoId");

ALTER TABLE "IngresoDirigente" ADD CONSTRAINT "IngresoDirigente_dirigenteId_fkey"
  FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IngresoDirigente" ADD CONSTRAINT "IngresoDirigente_catalogoIngresoId_fkey"
  FOREIGN KEY ("catalogoIngresoId") REFERENCES "CatalogoIngreso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "DirigenteEstudio" (
  "id" TEXT NOT NULL,
  "dirigenteId" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "institucion" TEXT,
  "anioEgreso" INTEGER,
  "cedula" TEXT,
  "certificado" BOOLEAN NOT NULL DEFAULT false,
  "otros" TEXT,
  CONSTRAINT "DirigenteEstudio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DirigenteEstudio_dirigenteId_idx" ON "DirigenteEstudio"("dirigenteId");

ALTER TABLE "DirigenteEstudio" ADD CONSTRAINT "DirigenteEstudio_dirigenteId_fkey"
  FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DirigenteRedSocial" (
  "id" TEXT NOT NULL,
  "dirigenteId" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "cuenta" TEXT NOT NULL,
  CONSTRAINT "DirigenteRedSocial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DirigenteRedSocial_dirigenteId_idx" ON "DirigenteRedSocial"("dirigenteId");

ALTER TABLE "DirigenteRedSocial" ADD CONSTRAINT "DirigenteRedSocial_dirigenteId_fkey"
  FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DirigenteContactoEmergencia" (
  "id" TEXT NOT NULL,
  "dirigenteId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "parentesco" TEXT NOT NULL,
  "telefono" TEXT NOT NULL,
  CONSTRAINT "DirigenteContactoEmergencia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DirigenteContactoEmergencia_dirigenteId_idx" ON "DirigenteContactoEmergencia"("dirigenteId");

ALTER TABLE "DirigenteContactoEmergencia" ADD CONSTRAINT "DirigenteContactoEmergencia_dirigenteId_fkey"
  FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
