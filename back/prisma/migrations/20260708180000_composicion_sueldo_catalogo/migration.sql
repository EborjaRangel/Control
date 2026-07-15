-- Composición del sueldo: líneas con catálogo + monto + nombre + tipo

CREATE TYPE "ConceptoSueldo" AS ENUM ('BASE', 'HONORARIOS', 'COSSOC', 'SETENTA_TREINTA', 'PF');

ALTER TABLE "Chambelan" ADD COLUMN "concepto" "ConceptoSueldo";
ALTER TABLE "Chambelan" ADD COLUMN "tipoDetalle" TEXT;
ALTER TABLE "Chambelan" ALTER COLUMN "nombre" DROP NOT NULL;

UPDATE "Chambelan"
SET "concepto" = CASE "tipo"::text
  WHEN 'HONORARIOS' THEN 'HONORARIOS'::"ConceptoSueldo"
  WHEN 'SETENTA_TREINTA' THEN 'SETENTA_TREINTA'::"ConceptoSueldo"
  WHEN 'COSSOC' THEN 'COSSOC'::"ConceptoSueldo"
  WHEN 'CHOCOLATES' THEN 'PF'::"ConceptoSueldo"
  ELSE 'BASE'::"ConceptoSueldo"
END
WHERE "concepto" IS NULL;

INSERT INTO "Chambelan" ("id", "nominaId", "nombre", "concepto", "monto", "tipoDetalle", "tipo")
SELECT
  md5(random()::text || n.id || 'h'),
  n.id,
  NULL,
  'HONORARIOS'::"ConceptoSueldo",
  n."honorarios",
  NULL,
  'HONORARIOS'::"TipoChambelan"
FROM "Nomina" n
WHERE n."honorarios" > 0;

INSERT INTO "Chambelan" ("id", "nominaId", "nombre", "concepto", "monto", "tipoDetalle", "tipo")
SELECT
  md5(random()::text || n.id || 's'),
  n.id,
  NULL,
  'SETENTA_TREINTA'::"ConceptoSueldo",
  n."setentaTreinta",
  NULL,
  'SETENTA_TREINTA'::"TipoChambelan"
FROM "Nomina" n
WHERE n."setentaTreinta" > 0;

INSERT INTO "Chambelan" ("id", "nominaId", "nombre", "concepto", "monto", "tipoDetalle", "tipo")
SELECT
  md5(random()::text || n.id || 'c'),
  n.id,
  NULL,
  'COSSOC'::"ConceptoSueldo",
  n."cossoc",
  NULL,
  'COSSOC'::"TipoChambelan"
FROM "Nomina" n
WHERE n."cossoc" > 0;

INSERT INTO "Chambelan" ("id", "nominaId", "nombre", "concepto", "monto", "tipoDetalle", "tipo")
SELECT
  md5(random()::text || n.id || 'ch'),
  n.id,
  NULL,
  'PF'::"ConceptoSueldo",
  n."chocolates",
  NULL,
  'CHOCOLATES'::"TipoChambelan"
FROM "Nomina" n
WHERE n."chocolates" > 0;

ALTER TABLE "Chambelan" ALTER COLUMN "concepto" SET NOT NULL;
ALTER TABLE "Chambelan" DROP COLUMN "tipo";
DROP TYPE "TipoChambelan";

ALTER TABLE "Nomina" DROP COLUMN "honorarios";
ALTER TABLE "Nomina" DROP COLUMN "setentaTreinta";
ALTER TABLE "Nomina" DROP COLUMN "cossoc";
ALTER TABLE "Nomina" DROP COLUMN "chocolates";
