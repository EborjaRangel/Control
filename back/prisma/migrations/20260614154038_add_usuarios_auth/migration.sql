-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'DIRIGENTE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "dirigenteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_dirigenteId_key" ON "Usuario"("dirigenteId");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE INDEX "Usuario_activo_idx" ON "Usuario"("activo");

-- CreateIndex
CREATE INDEX "Dirigente_colonia_idx" ON "Dirigente"("colonia");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
