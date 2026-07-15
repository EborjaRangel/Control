-- CreateEnum
CREATE TYPE "AlcanceNotificacion" AS ENUM ('TODOS', 'TIPO_DIRIGENTE', 'DISTRITO_FEDERAL', 'DISTRITO_LOCAL', 'COLONIA', 'UNIDAD_TERRITORIAL', 'SECCION');

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "alcance" "AlcanceNotificacion" NOT NULL,
    "colonia" TEXT,
    "seccionElectoral" TEXT,
    "unidadTerritorialId" TEXT,
    "distritoLocal" INTEGER,
    "distritoFederal" INTEGER,
    "tipoDirigente" "TipoDirigente",
    "enviadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPorId" TEXT,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificacionDestinatario" (
    "id" TEXT NOT NULL,
    "notificacionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "vistoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificacionDestinatario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacion_enviadoAt_idx" ON "Notificacion"("enviadoAt");

-- CreateIndex
CREATE INDEX "Notificacion_alcance_idx" ON "Notificacion"("alcance");

-- CreateIndex
CREATE INDEX "NotificacionDestinatario_usuarioId_vistoAt_idx" ON "NotificacionDestinatario"("usuarioId", "vistoAt");

-- CreateIndex
CREATE INDEX "NotificacionDestinatario_notificacionId_idx" ON "NotificacionDestinatario"("notificacionId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificacionDestinatario_notificacionId_usuarioId_key" ON "NotificacionDestinatario"("notificacionId", "usuarioId");

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_unidadTerritorialId_fkey" FOREIGN KEY ("unidadTerritorialId") REFERENCES "UnidadTerritorial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacionDestinatario" ADD CONSTRAINT "NotificacionDestinatario_notificacionId_fkey" FOREIGN KEY ("notificacionId") REFERENCES "Notificacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificacionDestinatario" ADD CONSTRAINT "NotificacionDestinatario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
