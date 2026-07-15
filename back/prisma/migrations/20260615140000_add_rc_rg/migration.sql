-- AlterEnum
ALTER TYPE "RolUsuario" ADD VALUE 'RC';
ALTER TYPE "RolUsuario" ADD VALUE 'RG';

-- CreateTable
CREATE TABLE "ResponsableColonia" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "primerApellido" TEXT NOT NULL,
    "segundoApellido" TEXT,
    "telefonoCelular" TEXT,
    "colonia" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponsableColonia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponsableGeneral" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "primerApellido" TEXT NOT NULL,
    "segundoApellido" TEXT,
    "telefonoCelular" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponsableGeneral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepresentanteCasilla" (
    "id" TEXT NOT NULL,
    "responsableColoniaId" TEXT,
    "responsableGeneralId" TEXT,
    "nombre" TEXT NOT NULL,
    "primerApellido" TEXT NOT NULL,
    "segundoApellido" TEXT,
    "fechaNacimiento" DATE NOT NULL,
    "sexo" TEXT,
    "claveElector" TEXT,
    "curp" TEXT,
    "seccionElectoral" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "numeroExterior" TEXT NOT NULL,
    "numeroInterior" TEXT,
    "codigoPostal" TEXT NOT NULL,
    "ineFrenteUrl" TEXT NOT NULL,
    "ineReversoUrl" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepresentanteCasilla_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "rcId" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "rgId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_rcId_key" ON "Usuario"("rcId");
CREATE UNIQUE INDEX "Usuario_rgId_key" ON "Usuario"("rgId");
CREATE INDEX "ResponsableColonia_activo_idx" ON "ResponsableColonia"("activo");
CREATE INDEX "ResponsableColonia_colonia_idx" ON "ResponsableColonia"("colonia");
CREATE INDEX "ResponsableGeneral_activo_idx" ON "ResponsableGeneral"("activo");
CREATE INDEX "RepresentanteCasilla_responsableColoniaId_idx" ON "RepresentanteCasilla"("responsableColoniaId");
CREATE INDEX "RepresentanteCasilla_responsableGeneralId_idx" ON "RepresentanteCasilla"("responsableGeneralId");
CREATE INDEX "RepresentanteCasilla_colonia_idx" ON "RepresentanteCasilla"("colonia");
CREATE INDEX "RepresentanteCasilla_seccionElectoral_idx" ON "RepresentanteCasilla"("seccionElectoral");
CREATE INDEX "RepresentanteCasilla_activo_idx" ON "RepresentanteCasilla"("activo");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rcId_fkey" FOREIGN KEY ("rcId") REFERENCES "ResponsableColonia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_rgId_fkey" FOREIGN KEY ("rgId") REFERENCES "ResponsableGeneral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepresentanteCasilla" ADD CONSTRAINT "RepresentanteCasilla_responsableColoniaId_fkey" FOREIGN KEY ("responsableColoniaId") REFERENCES "ResponsableColonia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepresentanteCasilla" ADD CONSTRAINT "RepresentanteCasilla_responsableGeneralId_fkey" FOREIGN KEY ("responsableGeneralId") REFERENCES "ResponsableGeneral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
