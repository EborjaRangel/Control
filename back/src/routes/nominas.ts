import { Router } from "express";
import { ValidationError } from "yup";
import { prisma } from "../lib/prisma.js";
import { requireAdmin, requireAuth } from "../lib/auth.js";
import { canAccessDirigentePanel } from "../lib/user-panel.js";
import { nominaInclude, upsertNomina } from "../lib/nomina-db.js";
import { serializeNomina } from "../lib/serialize-nomina.js";
import { nominaSchema } from "../lib/validation-nomina.js";
import { normalizarNominaParaGuardado } from "../lib/normalizar-dirigente.js";
import { normalizarTextoGuardado } from "../lib/normalizar-texto.js";

const router = Router();

router.use(requireAuth);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const dirigenteResumenSelect = {
  id: true,
  nombre: true,
  primerApellido: true,
  segundoApellido: true,
  tipo: true,
  colonia: true,
  seccionElectoral: true,
  activo: true,
} as const;

router.get("/", requireAdmin, async (req, res) => {
  try {
    const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim() : "";
    const tipo = typeof req.query.tipo === "string" ? req.query.tipo.trim() : "";
    const colonia = typeof req.query.colonia === "string" ? req.query.colonia.trim() : "";
    const incluirBajas = req.query.incluirBajas === "true";

    const nominas = await prisma.nomina.findMany({
      where: {
        dirigente: {
          ...(incluirBajas ? {} : { activo: true }),
          ...(tipo ? { tipo: tipo as "D1" | "D2" | "D3" | "D4" } : {}),
          ...(colonia ? { colonia: normalizarTextoGuardado(colonia) } : {}),
          ...(buscar
            ? {
                OR: [
                  { nombre: { contains: buscar, mode: "insensitive" } },
                  { primerApellido: { contains: buscar, mode: "insensitive" } },
                  { segundoApellido: { contains: buscar, mode: "insensitive" } },
                  { seccionElectoral: { contains: buscar, mode: "insensitive" } },
                  { colonia: { contains: buscar, mode: "insensitive" } },
                ],
              }
            : {}),
        },
      },
      include: {
        conceptos: true,
        dirigente: { select: dirigenteResumenSelect },
      },
      orderBy: [{ dirigente: { activo: "desc" } }, { dirigente: { primerApellido: "asc" } }],
    });

    res.json(
      nominas.map((n) => serializeNomina(n, n.dirigente)),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar nóminas" });
  }
});

router.get("/:dirigenteId", async (req, res) => {
  try {
    const dirigenteId = paramId(req.params.dirigenteId);
    if (!req.user || !(await canAccessDirigentePanel(req.user, dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const nomina = await prisma.nomina.findUnique({
      where: { dirigenteId },
      include: {
        conceptos: true,
        dirigente: { select: dirigenteResumenSelect },
      },
    });

    if (!nomina) {
      res.status(404).json({ error: "Nómina no encontrada" });
      return;
    }

    res.json(serializeNomina(nomina, nomina.dirigente));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener nómina" });
  }
});

router.put("/:dirigenteId", requireAdmin, async (req, res) => {
  try {
    const dirigenteId = paramId(req.params.dirigenteId);
    const data = await nominaSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const guardado = normalizarNominaParaGuardado(data);

    const dirigente = await prisma.dirigente.findUnique({
      where: { id: dirigenteId },
      select: { id: true },
    });
    if (!dirigente) {
      res.status(404).json({ error: "Dirigente no encontrado" });
      return;
    }

    const nomina = await prisma.$transaction(async (tx) =>
      upsertNomina(tx, dirigenteId, guardado),
    );

    const dirigenteResumen = await prisma.dirigente.findUniqueOrThrow({
      where: { id: dirigenteId },
      select: dirigenteResumenSelect,
    });

    res.json(serializeNomina(nomina, dirigenteResumen));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al guardar nómina" });
  }
});

export default router;
