-- CreateEnum
CREATE TYPE "TipoTransporteUnidad" AS ENUM ('CAMION', 'MICROBUS');

-- CreateEnum
CREATE TYPE "TipoRecorridoTransporte" AS ENUM ('IDA', 'VUELTA', 'IDA_Y_VUELTA');

-- CreateTable
CREATE TABLE "RegistroTransporte" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,
    "tipoUnidad" "TipoTransporteUnidad" NOT NULL,
    "placas" TEXT NOT NULL,
    "nombreChofer" TEXT NOT NULL,
    "telefonoChofer" TEXT NOT NULL,
    "tipoRecorrido" "TipoRecorridoTransporte" NOT NULL,
    "puntoEntrega" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "registradoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroTransporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroTransporteFoto" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroTransporteFoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistroTransporte_eventoId_idx" ON "RegistroTransporte"("eventoId");

-- CreateIndex
CREATE INDEX "RegistroTransporte_dirigenteId_idx" ON "RegistroTransporte"("dirigenteId");

-- CreateIndex
CREATE INDEX "RegistroTransporte_registradoAt_idx" ON "RegistroTransporte"("registradoAt");

-- CreateIndex
CREATE INDEX "RegistroTransporteFoto_registroId_idx" ON "RegistroTransporteFoto"("registroId");

-- AddForeignKey
ALTER TABLE "RegistroTransporte" ADD CONSTRAINT "RegistroTransporte_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoAsistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroTransporte" ADD CONSTRAINT "RegistroTransporte_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroTransporteFoto" ADD CONSTRAINT "RegistroTransporteFoto_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "RegistroTransporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
