-- Eventos de asistencia y registros de pase de lista
CREATE TYPE "AlcanceEvento" AS ENUM ('COLONIA', 'SECCION', 'UNIDAD_TERRITORIAL');
CREATE TYPE "EstadoEvento" AS ENUM ('PROGRAMADO', 'ABIERTO', 'CERRADO');

CREATE TABLE "EventoAsistencia" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "lugar" TEXT NOT NULL,
    "alcance" "AlcanceEvento" NOT NULL,
    "colonia" TEXT,
    "seccionElectoral" TEXT,
    "unidadTerritorialId" TEXT,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'PROGRAMADO',
    "abiertoAt" TIMESTAMP(3),
    "cerradoAt" TIMESTAMP(3),
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventoAsistencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegistroAsistencia" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,
    "registradoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPorId" TEXT,

    CONSTRAINT "RegistroAsistencia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistroAsistencia_eventoId_dirigenteId_key" ON "RegistroAsistencia"("eventoId", "dirigenteId");
CREATE INDEX "RegistroAsistencia_eventoId_idx" ON "RegistroAsistencia"("eventoId");
CREATE INDEX "RegistroAsistencia_dirigenteId_idx" ON "RegistroAsistencia"("dirigenteId");

CREATE INDEX "EventoAsistencia_estado_idx" ON "EventoAsistencia"("estado");
CREATE INDEX "EventoAsistencia_fecha_idx" ON "EventoAsistencia"("fecha");
CREATE INDEX "EventoAsistencia_alcance_idx" ON "EventoAsistencia"("alcance");
CREATE INDEX "EventoAsistencia_colonia_idx" ON "EventoAsistencia"("colonia");
CREATE INDEX "EventoAsistencia_seccionElectoral_idx" ON "EventoAsistencia"("seccionElectoral");
CREATE INDEX "EventoAsistencia_unidadTerritorialId_idx" ON "EventoAsistencia"("unidadTerritorialId");

ALTER TABLE "EventoAsistencia" ADD CONSTRAINT "EventoAsistencia_unidadTerritorialId_fkey" FOREIGN KEY ("unidadTerritorialId") REFERENCES "UnidadTerritorial"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RegistroAsistencia" ADD CONSTRAINT "RegistroAsistencia_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoAsistencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistroAsistencia" ADD CONSTRAINT "RegistroAsistencia_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
