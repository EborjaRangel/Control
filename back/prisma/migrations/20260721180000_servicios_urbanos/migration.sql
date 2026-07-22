-- CreateEnum
CREATE TYPE "TipoServicioUrbano" AS ENUM ('FUGA_AGUA', 'BACHE', 'DESASOLVE_COLADERA', 'PODA_ARBOL', 'LUMINARIAS_FUNDIDAS');

-- CreateTable
CREATE TABLE "ReporteServicioUrbano" (
    "id" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,
    "tipo" "TipoServicioUrbano" NOT NULL,
    "descripcion" TEXT,
    "colonia" TEXT,
    "seccionElectoral" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "fotoAntesUrl" TEXT NOT NULL,
    "fotoDespuesUrl" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReporteServicioUrbano_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReporteServicioUrbano_dirigenteId_idx" ON "ReporteServicioUrbano"("dirigenteId");

-- CreateIndex
CREATE INDEX "ReporteServicioUrbano_tipo_idx" ON "ReporteServicioUrbano"("tipo");

-- CreateIndex
CREATE INDEX "ReporteServicioUrbano_activo_idx" ON "ReporteServicioUrbano"("activo");

-- CreateIndex
CREATE INDEX "ReporteServicioUrbano_createdAt_idx" ON "ReporteServicioUrbano"("createdAt");

-- AddForeignKey
ALTER TABLE "ReporteServicioUrbano" ADD CONSTRAINT "ReporteServicioUrbano_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
