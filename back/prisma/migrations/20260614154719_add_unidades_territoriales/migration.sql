-- AlterTable
ALTER TABLE "Dirigente" ADD COLUMN     "unidadTerritorialId" TEXT;

-- CreateTable
CREATE TABLE "UnidadTerritorial" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoUt" TEXT,
    "distritoLocal" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadTerritorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColoniaUnidadTerritorial" (
    "id" TEXT NOT NULL,
    "coloniaNombre" TEXT NOT NULL,
    "unidadTerritorialId" TEXT NOT NULL,

    CONSTRAINT "ColoniaUnidadTerritorial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UnidadTerritorial_clave_key" ON "UnidadTerritorial"("clave");

-- CreateIndex
CREATE INDEX "UnidadTerritorial_nombre_idx" ON "UnidadTerritorial"("nombre");

-- CreateIndex
CREATE INDEX "ColoniaUnidadTerritorial_coloniaNombre_idx" ON "ColoniaUnidadTerritorial"("coloniaNombre");

-- CreateIndex
CREATE UNIQUE INDEX "ColoniaUnidadTerritorial_coloniaNombre_unidadTerritorialId_key" ON "ColoniaUnidadTerritorial"("coloniaNombre", "unidadTerritorialId");

-- CreateIndex
CREATE INDEX "Dirigente_unidadTerritorialId_idx" ON "Dirigente"("unidadTerritorialId");

-- AddForeignKey
ALTER TABLE "Dirigente" ADD CONSTRAINT "Dirigente_unidadTerritorialId_fkey" FOREIGN KEY ("unidadTerritorialId") REFERENCES "UnidadTerritorial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColoniaUnidadTerritorial" ADD CONSTRAINT "ColoniaUnidadTerritorial_unidadTerritorialId_fkey" FOREIGN KEY ("unidadTerritorialId") REFERENCES "UnidadTerritorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
