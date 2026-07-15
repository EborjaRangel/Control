-- CreateTable
CREATE TABLE "Nomina" (
    "id" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,
    "sueldoBase" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "enProgramaSocial" BOOLEAN NOT NULL DEFAULT false,
    "programaMonto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "chocolates" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nomina_pkey" PRIMARY KEY ("id")
);

-- Migrar datos de sueldo desde Dirigente
INSERT INTO "Nomina" (
    "id",
    "dirigenteId",
    "sueldoBase",
    "enProgramaSocial",
    "programaMonto",
    "chocolates",
    "createdAt",
    "updatedAt"
)
SELECT
    'nom' || substr(md5(random()::text || d."id"), 1, 22),
    d."id",
    d."sueldoBase",
    d."enProgramaSocial",
    d."programaMonto",
    d."chocolates",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Dirigente" d;

-- Reasignar chambelanes a la nómina del dirigente
ALTER TABLE "Chambelan" ADD COLUMN "nominaId" TEXT;

UPDATE "Chambelan" c
SET "nominaId" = n."id"
FROM "Nomina" n
WHERE n."dirigenteId" = c."dirigenteId";

-- Chambelanes huérfanos (si los hubiera) se eliminan
DELETE FROM "Chambelan" WHERE "nominaId" IS NULL;

ALTER TABLE "Chambelan" DROP CONSTRAINT IF EXISTS "Chambelan_dirigenteId_fkey";
DROP INDEX IF EXISTS "Chambelan_dirigenteId_idx";
ALTER TABLE "Chambelan" DROP COLUMN "dirigenteId";
ALTER TABLE "Chambelan" ALTER COLUMN "nominaId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Nomina_dirigenteId_key" ON "Nomina"("dirigenteId");
CREATE INDEX "Nomina_dirigenteId_idx" ON "Nomina"("dirigenteId");
CREATE INDEX "Chambelan_nominaId_idx" ON "Chambelan"("nominaId");

-- AddForeignKey
ALTER TABLE "Nomina" ADD CONSTRAINT "Nomina_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Chambelan" ADD CONSTRAINT "Chambelan_nominaId_fkey" FOREIGN KEY ("nominaId") REFERENCES "Nomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Eliminar columnas de sueldo en Dirigente (ahora viven en Nomina)
ALTER TABLE "Dirigente" DROP COLUMN "sueldoBase",
DROP COLUMN "enProgramaSocial",
DROP COLUMN "programaMonto",
DROP COLUMN "chocolates";
