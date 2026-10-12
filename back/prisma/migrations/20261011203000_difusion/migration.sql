-- CreateEnum
CREATE TYPE "EstadoCampanaDifusion" AS ENUM ('ACTIVA', 'CERRADA');

-- CreateTable
CREATE TABLE "CampanaDifusion" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "estado" "EstadoCampanaDifusion" NOT NULL DEFAULT 'ACTIVA',
    "cerradaAt" TIMESTAMP(3),
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampanaDifusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroDifusion" (
    "id" TEXT NOT NULL,
    "campanaId" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,
    "fotoUrl" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "registradoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroDifusion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampanaDifusion_estado_idx" ON "CampanaDifusion"("estado");
CREATE INDEX "CampanaDifusion_fechaInicio_idx" ON "CampanaDifusion"("fechaInicio");
CREATE INDEX "CampanaDifusion_fechaFin_idx" ON "CampanaDifusion"("fechaFin");
CREATE INDEX "RegistroDifusion_campanaId_idx" ON "RegistroDifusion"("campanaId");
CREATE INDEX "RegistroDifusion_dirigenteId_idx" ON "RegistroDifusion"("dirigenteId");
CREATE INDEX "RegistroDifusion_registradoAt_idx" ON "RegistroDifusion"("registradoAt");

-- AddForeignKey
ALTER TABLE "RegistroDifusion" ADD CONSTRAINT "RegistroDifusion_campanaId_fkey" FOREIGN KEY ("campanaId") REFERENCES "CampanaDifusion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistroDifusion" ADD CONSTRAINT "RegistroDifusion_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
