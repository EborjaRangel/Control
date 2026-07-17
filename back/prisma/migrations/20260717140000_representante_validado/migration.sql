ALTER TABLE "RepresentanteCasilla" ADD COLUMN "validado" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "RepresentanteCasilla_validado_idx" ON "RepresentanteCasilla"("validado");
