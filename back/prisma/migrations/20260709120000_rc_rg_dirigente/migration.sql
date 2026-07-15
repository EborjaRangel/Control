-- RC y RG deben vincularse a un dirigente

ALTER TABLE "ResponsableColonia" ADD COLUMN "dirigenteId" TEXT;

ALTER TABLE "ResponsableGeneral" ADD COLUMN "dirigenteId" TEXT;

CREATE UNIQUE INDEX "ResponsableColonia_dirigenteId_key" ON "ResponsableColonia"("dirigenteId");
CREATE UNIQUE INDEX "ResponsableGeneral_dirigenteId_key" ON "ResponsableGeneral"("dirigenteId");

CREATE INDEX "ResponsableColonia_dirigenteId_idx" ON "ResponsableColonia"("dirigenteId");
CREATE INDEX "ResponsableGeneral_dirigenteId_idx" ON "ResponsableGeneral"("dirigenteId");

ALTER TABLE "ResponsableColonia" ADD CONSTRAINT "ResponsableColonia_dirigenteId_fkey"
  FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResponsableGeneral" ADD CONSTRAINT "ResponsableGeneral_dirigenteId_fkey"
  FOREIGN KEY ("dirigenteId") REFERENCES "Dirigente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
