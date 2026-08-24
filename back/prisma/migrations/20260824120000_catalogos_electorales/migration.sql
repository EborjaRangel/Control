-- CreateTable
CREATE TABLE "ResultadoAlcaldiaProceso" (
    "anio" INTEGER NOT NULL,
    "cargo" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "urlFuente" TEXT NOT NULL,
    "generadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResultadoAlcaldiaProceso_pkey" PRIMARY KEY ("anio")
);

-- CreateTable
CREATE TABLE "ResultadoAlcaldiaSeccion" (
    "id" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "seccion" TEXT NOT NULL,
    "listaNominal" INTEGER NOT NULL,
    "votacionTotal" INTEGER NOT NULL,
    "participacionPct" DOUBLE PRECISION NOT NULL,
    "votosNulos" INTEGER NOT NULL,
    "votosNulosPct" DOUBLE PRECISION NOT NULL,
    "partidos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultadoAlcaldiaSeccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasillaElectoralCatalogo" (
    "id" TEXT NOT NULL,
    "vigencia" TEXT NOT NULL,
    "fuente" TEXT NOT NULL,
    "urlFuente" TEXT NOT NULL,
    "generadoEn" TIMESTAMP(3) NOT NULL,
    "totalCasillas" INTEGER NOT NULL,
    "totalSecciones" INTEGER NOT NULL,

    CONSTRAINT "CasillaElectoralCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CasillaElectoral" (
    "id" TEXT NOT NULL,
    "catalogoId" TEXT NOT NULL,
    "seccion" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "tipoLabel" TEXT NOT NULL,
    "extContigua" INTEGER,
    "listaNominal" INTEGER NOT NULL,
    "distritoFederal" INTEGER NOT NULL,

    CONSTRAINT "CasillaElectoral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResultadoAlcaldiaSeccion_anio_seccion_key" ON "ResultadoAlcaldiaSeccion"("anio", "seccion");

-- CreateIndex
CREATE INDEX "ResultadoAlcaldiaSeccion_seccion_idx" ON "ResultadoAlcaldiaSeccion"("seccion");

-- CreateIndex
CREATE INDEX "ResultadoAlcaldiaSeccion_anio_idx" ON "ResultadoAlcaldiaSeccion"("anio");

-- CreateIndex
CREATE INDEX "CasillaElectoral_seccion_idx" ON "CasillaElectoral"("seccion");

-- CreateIndex
CREATE INDEX "CasillaElectoral_catalogoId_idx" ON "CasillaElectoral"("catalogoId");

-- AddForeignKey
ALTER TABLE "ResultadoAlcaldiaSeccion" ADD CONSTRAINT "ResultadoAlcaldiaSeccion_anio_fkey" FOREIGN KEY ("anio") REFERENCES "ResultadoAlcaldiaProceso"("anio") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CasillaElectoral" ADD CONSTRAINT "CasillaElectoral_catalogoId_fkey" FOREIGN KEY ("catalogoId") REFERENCES "CasillaElectoralCatalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
