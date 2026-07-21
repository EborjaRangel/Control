-- CreateEnum
CREATE TYPE "AuditAccion" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SEND', 'STATE_CHANGE');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "accion" "AuditAccion" NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "entidadLabel" TEXT,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "usuarioRol" "RolUsuario",
    "dirigenteId" TEXT,
    "rcId" TEXT,
    "rgId" TEXT,
    "cambios" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_entidad_entidadId_idx" ON "AuditLog"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "AuditLog_usuarioId_createdAt_idx" ON "AuditLog"("usuarioId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_accion_createdAt_idx" ON "AuditLog"("accion", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_dirigenteId_idx" ON "AuditLog"("dirigenteId");
