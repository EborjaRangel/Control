-- CreateEnum
CREATE TYPE "CanalComunicacion" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EstadoEnvioComunicacion" AS ENUM ('ENVIADO', 'FALLIDO', 'OMITIDO');

-- CreateTable
CREATE TABLE "EnvioComunicacion" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,
    "canal" "CanalComunicacion" NOT NULL,
    "destino" TEXT NOT NULL,
    "estado" "EstadoEnvioComunicacion" NOT NULL,
    "error" TEXT,
    "proveedorId" TEXT,
    "enviadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvioComunicacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnvioComunicacion_eventoId_idx" ON "EnvioComunicacion"("eventoId");

-- CreateIndex
CREATE INDEX "EnvioComunicacion_dirigenteId_idx" ON "EnvioComunicacion"("dirigenteId");

-- CreateIndex
CREATE INDEX "EnvioComunicacion_canal_idx" ON "EnvioComunicacion"("canal");

-- CreateIndex
CREATE INDEX "EnvioComunicacion_enviadoAt_idx" ON "EnvioComunicacion"("enviadoAt");

-- AddForeignKey
ALTER TABLE "EnvioComunicacion" ADD CONSTRAINT "EnvioComunicacion_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoAsistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvioComunicacion" ADD CONSTRAINT "EnvioComunicacion_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
