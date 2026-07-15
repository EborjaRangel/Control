-- AlterEnum
ALTER TYPE "RolUsuario" ADD VALUE 'DETECTADO';

-- CreateTable
CREATE TABLE "Detectado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "primerApellido" TEXT NOT NULL,
    "segundoApellido" TEXT,
    "telefonoCelular" TEXT,
    "seccionElectoral" TEXT NOT NULL,
    "metaPersonas" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Detectado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaDetectada" (
    "id" TEXT NOT NULL,
    "detectadoId" TEXT NOT NULL,
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

    CONSTRAINT "PersonaDetectada_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "detectadoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_detectadoId_key" ON "Usuario"("detectadoId");
CREATE INDEX "Detectado_activo_idx" ON "Detectado"("activo");
CREATE INDEX "Detectado_seccionElectoral_idx" ON "Detectado"("seccionElectoral");
CREATE INDEX "PersonaDetectada_detectadoId_idx" ON "PersonaDetectada"("detectadoId");
CREATE INDEX "PersonaDetectada_seccionElectoral_idx" ON "PersonaDetectada"("seccionElectoral");
CREATE INDEX "PersonaDetectada_activo_idx" ON "PersonaDetectada"("activo");
CREATE INDEX "PersonaDetectada_claveElector_idx" ON "PersonaDetectada"("claveElector");
CREATE INDEX "PersonaDetectada_curp_idx" ON "PersonaDetectada"("curp");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_detectadoId_fkey" FOREIGN KEY ("detectadoId") REFERENCES "Detectado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PersonaDetectada" ADD CONSTRAINT "PersonaDetectada_detectadoId_fkey" FOREIGN KEY ("detectadoId") REFERENCES "Detectado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
