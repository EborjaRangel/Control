-- CreateEnum
CREATE TYPE "TipoDirigente" AS ENUM ('D1', 'D2', 'D3', 'D4');

-- CreateEnum
CREATE TYPE "TipoChambelan" AS ENUM ('NOMINA', 'PROGRAMA');

-- CreateTable
CREATE TABLE "Dirigente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "primerApellido" TEXT NOT NULL,
    "segundoApellido" TEXT,
    "fechaNacimiento" DATE NOT NULL,
    "telefonoCelular" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "tipo" "TipoDirigente" NOT NULL,
    "seccionElectoral" TEXT NOT NULL,
    "colonia" TEXT NOT NULL,
    "calle" TEXT NOT NULL,
    "numeroExterior" TEXT NOT NULL,
    "numeroInterior" TEXT,
    "codigoPostal" TEXT NOT NULL,
    "sueldoBase" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "enProgramaSocial" BOOLEAN NOT NULL DEFAULT false,
    "programaMonto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "chocolates" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dirigente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chambelan" (
    "id" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoChambelan" NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Chambelan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dirigente_activo_idx" ON "Dirigente"("activo");

-- CreateIndex
CREATE INDEX "Dirigente_tipo_idx" ON "Dirigente"("tipo");

-- CreateIndex
CREATE INDEX "Dirigente_seccionElectoral_idx" ON "Dirigente"("seccionElectoral");

-- CreateIndex
CREATE INDEX "Chambelan_dirigenteId_idx" ON "Chambelan"("dirigenteId");

-- AddForeignKey
ALTER TABLE "Chambelan" ADD CONSTRAINT "Chambelan_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
