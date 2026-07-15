-- Composición del sueldo: Honorarios, 70/30, COSSOC, Chocolates + chambelanes por concepto

ALTER TABLE "Nomina" ADD COLUMN "honorarios" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Nomina" ADD COLUMN "setentaTreinta" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Nomina" ADD COLUMN "cossoc" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "Nomina"
SET
  "honorarios" = "sueldoBase",
  "cossoc" = CASE WHEN "enProgramaSocial" THEN "programaMonto" ELSE 0 END;

CREATE TYPE "TipoChambelan_new" AS ENUM ('HONORARIOS', 'SETENTA_TREINTA', 'COSSOC', 'CHOCOLATES');

ALTER TABLE "Chambelan"
  ALTER COLUMN "tipo" TYPE "TipoChambelan_new"
  USING (
    CASE "tipo"::text
      WHEN 'NOMINA' THEN 'HONORARIOS'::"TipoChambelan_new"
      WHEN 'PROGRAMA' THEN 'COSSOC'::"TipoChambelan_new"
      ELSE 'HONORARIOS'::"TipoChambelan_new"
    END
  );

DROP TYPE "TipoChambelan";
ALTER TYPE "TipoChambelan_new" RENAME TO "TipoChambelan";
