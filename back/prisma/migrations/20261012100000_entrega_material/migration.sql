-- CreateTable
CREATE TABLE "EventoEntregaMaterial" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'PROGRAMADO',
    "abiertoAt" TIMESTAMP(3),
    "cerradoAt" TIMESTAMP(3),
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventoEntregaMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventoEntregaMaterialDirigente" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,

    CONSTRAINT "EventoEntregaMaterialDirigente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionMaterialEntrega" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fotoUrl" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "AsignacionMaterialEntrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroEntregaMaterial" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "dirigenteId" TEXT NOT NULL,
    "registradoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registradoPorId" TEXT,

    CONSTRAINT "RegistroEntregaMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroEntregaMaterialLinea" (
    "id" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fotoUrl" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "RegistroEntregaMaterialLinea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventoEntregaMaterial_estado_idx" ON "EventoEntregaMaterial"("estado");

-- CreateIndex
CREATE INDEX "EventoEntregaMaterial_fechaInicio_idx" ON "EventoEntregaMaterial"("fechaInicio");

-- CreateIndex
CREATE INDEX "EventoEntregaMaterial_fechaFin_idx" ON "EventoEntregaMaterial"("fechaFin");

-- CreateIndex
CREATE INDEX "EventoEntregaMaterialDirigente_eventoId_idx" ON "EventoEntregaMaterialDirigente"("eventoId");

-- CreateIndex
CREATE INDEX "EventoEntregaMaterialDirigente_dirigenteId_idx" ON "EventoEntregaMaterialDirigente"("dirigenteId");

-- CreateIndex
CREATE UNIQUE INDEX "EventoEntregaMaterialDirigente_eventoId_dirigenteId_key" ON "EventoEntregaMaterialDirigente"("eventoId", "dirigenteId");

-- CreateIndex
CREATE INDEX "AsignacionMaterialEntrega_eventoId_dirigenteId_idx" ON "AsignacionMaterialEntrega"("eventoId", "dirigenteId");

-- CreateIndex
CREATE INDEX "AsignacionMaterialEntrega_dirigenteId_idx" ON "AsignacionMaterialEntrega"("dirigenteId");

-- CreateIndex
CREATE INDEX "RegistroEntregaMaterial_eventoId_idx" ON "RegistroEntregaMaterial"("eventoId");

-- CreateIndex
CREATE INDEX "RegistroEntregaMaterial_dirigenteId_idx" ON "RegistroEntregaMaterial"("dirigenteId");

-- CreateIndex
CREATE INDEX "RegistroEntregaMaterial_registradoAt_idx" ON "RegistroEntregaMaterial"("registradoAt");

-- CreateIndex
CREATE INDEX "RegistroEntregaMaterial_registradoPorId_idx" ON "RegistroEntregaMaterial"("registradoPorId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistroEntregaMaterial_eventoId_dirigenteId_key" ON "RegistroEntregaMaterial"("eventoId", "dirigenteId");

-- CreateIndex
CREATE INDEX "RegistroEntregaMaterialLinea_registroId_idx" ON "RegistroEntregaMaterialLinea"("registroId");

-- AddForeignKey
ALTER TABLE "EventoEntregaMaterialDirigente" ADD CONSTRAINT "EventoEntregaMaterialDirigente_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoEntregaMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoEntregaMaterialDirigente" ADD CONSTRAINT "EventoEntregaMaterialDirigente_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionMaterialEntrega" ADD CONSTRAINT "AsignacionMaterialEntrega_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoEntregaMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionMaterialEntrega" ADD CONSTRAINT "AsignacionMaterialEntrega_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroEntregaMaterial" ADD CONSTRAINT "RegistroEntregaMaterial_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "EventoEntregaMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroEntregaMaterial" ADD CONSTRAINT "RegistroEntregaMaterial_dirigenteId_fkey" FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroEntregaMaterial" ADD CONSTRAINT "RegistroEntregaMaterial_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroEntregaMaterialLinea" ADD CONSTRAINT "RegistroEntregaMaterialLinea_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "RegistroEntregaMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
