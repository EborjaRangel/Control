-- CreateTable
CREATE TABLE "Asamblea" (
    "id" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "lugar" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "seccionElectoral" TEXT NOT NULL,
    "cantidadConvocada" INTEGER NOT NULL,
    "cantidadReal" INTEGER NOT NULL,
    "observacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asamblea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsambleaFoto" (
    "id" TEXT NOT NULL,
    "asambleaId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsambleaFoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asamblea_dirigenteId_idx" ON "Asamblea"("dirigenteId");

-- CreateIndex
CREATE INDEX "Asamblea_fecha_idx" ON "Asamblea"("fecha");

-- CreateIndex
CREATE INDEX "Asamblea_activo_idx" ON "Asamblea"("activo");

-- CreateIndex
CREATE INDEX "Asamblea_seccionElectoral_idx" ON "Asamblea"("seccionElectoral");

-- CreateIndex
CREATE INDEX "AsambleaFoto_asambleaId_idx" ON "AsambleaFoto"("asambleaId");

-- AddForeignKey
ALTER TABLE "Asamblea" ADD CONSTRAINT "Asamblea_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsambleaFoto" ADD CONSTRAINT "AsambleaFoto_asambleaId_fkey" FOREIGN KEY ("asambleaId") REFERENCES "Asamblea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
