import { Router } from "express";
import { ValidationError } from "yup";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { isStaffRol, requireStaff, requireAuth, type AuthUser } from "../lib/auth.js";
import { canAccessDirigentePanel } from "../lib/user-panel.js";
import { serializeDetectado, serializePersona } from "../lib/serialize-detectado.js";
import {
  detectadoCreateSchema,
  detectadoUpdateSchema,
  dirigenteMetaDetectadosSchema,
  personaDetectadaSchema,
} from "../lib/validation-detectado.js";
import {
  dirigenteResumenSelect,
  serializeDirigenteDetectados,
} from "../lib/serialize-dirigente-detectados.js";
import { esSeccionValida } from "../lib/secciones-electorales.js";
import { variantesColoniaParaBusqueda } from "../lib/colonias.js";

const router = Router();

router.use(requireAuth);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

const detectadoInclude = {
  dirigente: { select: dirigenteResumenSelect },
  _count: { select: { personas: { where: { activo: true } } } },
} as const;

async function validarSeccionPersona(detectadoId: string, seccionElectoral: string) {
  const detectado = await prisma.detectado.findUnique({
    where: { id: detectadoId },
    select: { seccionElectoral: true, activo: true },
  });
  if (!detectado || !detectado.activo) {
    return "Detectado no encontrado o inactivo";
  }
  if (!esSeccionValida(seccionElectoral)) {
    return "Sección electoral inválida para Coyoacán";
  }
  if (seccionElectoral !== detectado.seccionElectoral) {
    return `Solo puedes registrar personas de la sección ${detectado.seccionElectoral}`;
  }
  return null;
}

async function canManageDetectadoPersonas(user: AuthUser, detectadoId: string) {
  if (isStaffRol(user.rol)) return true;
  const detectado = await prisma.detectado.findUnique({
    where: { id: detectadoId },
    select: { dirigenteId: true, activo: true },
  });
  if (!detectado || !detectado.activo) return false;
  return canAccessDirigentePanel(user, detectado.dirigenteId);
}

router.get("/", requireStaff, async (req, res) => {
  try {
    const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim() : "";
    const seccion = typeof req.query.seccion === "string" ? req.query.seccion.trim() : "";
    const dirigenteId =
      typeof req.query.dirigenteId === "string" ? req.query.dirigenteId.trim() : "";
    const incluirBajas = req.query.incluirBajas === "true";

    const detectados = await prisma.detectado.findMany({
      where: {
        ...(incluirBajas ? {} : { activo: true }),
        ...(dirigenteId ? { dirigenteId } : {}),
        ...(seccion ? { seccionElectoral: seccion } : {}),
        ...(buscar
          ? {
              OR: [
                { nombre: { contains: buscar, mode: "insensitive" } },
                { primerApellido: { contains: buscar, mode: "insensitive" } },
                { segundoApellido: { contains: buscar, mode: "insensitive" } },
                { seccionElectoral: { contains: buscar, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: detectadoInclude,
      orderBy: [{ activo: "desc" }, { primerApellido: "asc" }],
    });

    res.json(
      detectados.map((d) =>
        serializeDetectado(d, { personasActivas: d._count.personas }),
      ),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar detectados" });
  }
});

router.get("/dirigentes", requireStaff, async (req, res) => {
  try {
    const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim() : "";
    const coloniaQuery =
      typeof req.query.colonia === "string" ? req.query.colonia.trim() : "";
    const coloniaFiltro = coloniaQuery ? variantesColoniaParaBusqueda(coloniaQuery) : [];
    const incluirBajas = req.query.incluirBajas === "true";

    const dirigentes = await prisma.dirigente.findMany({
      where: {
        ...(incluirBajas ? {} : { activo: true }),
        ...(coloniaFiltro.length > 0 ? { colonia: { in: coloniaFiltro } } : {}),
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
      select: {
        ...dirigenteResumenSelect,
        _count: { select: { detectados: { where: { activo: true } } } },
      },
      orderBy: [{ activo: "desc" }, { primerApellido: "asc" }],
    });

    res.json(
      dirigentes.map((d) =>
        serializeDirigenteDetectados(d, d._count.detectados),
      ),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar dirigentes" });
  }
});

router.get("/dirigentes/:dirigenteId", async (req, res) => {
  try {
    const dirigenteId = paramId(req.params.dirigenteId);
    if (!req.user || !(await canAccessDirigentePanel(req.user, dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const dirigente = await prisma.dirigente.findUnique({
      where: { id: dirigenteId },
      select: {
        ...dirigenteResumenSelect,
        _count: { select: { detectados: { where: { activo: true } } } },
      },
    });

    if (!dirigente) {
      res.status(404).json({ error: "Dirigente no encontrado" });
      return;
    }

    const detectados = await prisma.detectado.findMany({
      where: { dirigenteId, activo: true },
      include: detectadoInclude,
      orderBy: { primerApellido: "asc" },
    });

    res.json({
      dirigente: serializeDirigenteDetectados(dirigente, dirigente._count.detectados),
      detectados: detectados.map((d) =>
        serializeDetectado(d, { personasActivas: d._count.personas }),
      ),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener detectados del dirigente" });
  }
});

router.put("/dirigentes/:dirigenteId/meta", requireStaff, async (req, res) => {
  try {
    const dirigenteId = paramId(req.params.dirigenteId);
    const data = await dirigenteMetaDetectadosSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const dirigente = await prisma.dirigente.update({
      where: { id: dirigenteId },
      data: { metaDetectados: data.metaDetectados },
      select: {
        ...dirigenteResumenSelect,
        _count: { select: { detectados: { where: { activo: true } } } },
      },
    });

    res.json(serializeDirigenteDetectados(dirigente, dirigente._count.detectados));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      res.status(404).json({ error: "Dirigente no encontrado" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al actualizar meta de detectados" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const data = await detectadoCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (!req.user || !(await canAccessDirigentePanel(req.user, data.dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    if (!isStaffRol(req.user.rol) && req.user.rol !== "DIRIGENTE") {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const dirigente = await prisma.dirigente.findUnique({
      where: { id: data.dirigenteId },
      select: { id: true, activo: true, seccionElectoral: true },
    });
    if (!dirigente || !dirigente.activo) {
      res.status(400).json({ error: "Dirigente no encontrado o inactivo" });
      return;
    }
    if (data.seccionElectoral !== dirigente.seccionElectoral) {
      res.status(400).json({
        error: `El detectado debe operar en la sección ${dirigente.seccionElectoral} del dirigente`,
      });
      return;
    }

    const detectado = await prisma.detectado.create({
      data: {
        dirigenteId: data.dirigenteId,
        nombre: data.nombre,
        primerApellido: data.primerApellido,
        segundoApellido: data.segundoApellido || null,
        telefonoCelular: data.telefonoCelular || null,
        seccionElectoral: data.seccionElectoral,
        ineFrenteUrl: data.ineFrenteUrl,
        ineReversoUrl: data.ineReversoUrl,
      },
      include: detectadoInclude,
    });

    res.status(201).json(
      serializeDetectado(detectado, { personasActivas: detectado._count.personas }),
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al crear detectado" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);

    const detectado = await prisma.detectado.findUnique({
      where: { id },
      include: {
        ...detectadoInclude,
        personas: {
          where: { activo: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!detectado) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    if (!req.user || !(await canAccessDirigentePanel(req.user, detectado.dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    res.json(
      serializeDetectado(detectado, {
        personasActivas: detectado._count.personas,
      }),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener detectado" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const id = paramId(req.params.id);

    const existing = await prisma.detectado.findUnique({
      where: { id },
      include: { dirigente: { select: { seccionElectoral: true, activo: true } } },
    });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    if (!req.user || !(await canAccessDirigentePanel(req.user, existing.dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    if (!isStaffRol(req.user.rol) && req.user.rol !== "DIRIGENTE") {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const data = await detectadoUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (
      existing.dirigente &&
      existing.dirigente.activo &&
      data.seccionElectoral !== existing.dirigente.seccionElectoral
    ) {
      res.status(400).json({
        error: `El detectado debe operar en la sección ${existing.dirigente.seccionElectoral} del dirigente`,
      });
      return;
    }

    const detectado = await prisma.detectado.update({
      where: { id },
      data: {
        nombre: data.nombre,
        primerApellido: data.primerApellido,
        segundoApellido: data.segundoApellido || null,
        telefonoCelular: data.telefonoCelular || null,
        seccionElectoral: data.seccionElectoral,
        ineFrenteUrl: data.ineFrenteUrl,
        ineReversoUrl: data.ineReversoUrl,
      },
      include: {
        ...detectadoInclude,
        personas: { where: { activo: true }, orderBy: { createdAt: "desc" } },
      },
    });

    res.json(
      serializeDetectado(detectado, {
        personasActivas: detectado._count.personas,
      }),
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al actualizar detectado" });
  }
});

router.delete("/:id", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const reactivar = req.query.reactivar === "true";

    const detectado = await prisma.detectado.update({
      where: { id },
      data: { activo: reactivar },
      include: detectadoInclude,
    });

    res.json(
      serializeDetectado(detectado, {
        personasActivas: detectado._count.personas,
      }),
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
});

router.post("/:id/personas", requireAuth, async (req, res) => {
  try {
    const detectadoId = paramId(req.params.id);

    if (!req.user || !(await canManageDetectadoPersonas(req.user, detectadoId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const data = await personaDetectadaSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const seccionError = await validarSeccionPersona(detectadoId, data.seccionElectoral);
    if (seccionError) {
      res.status(400).json({ error: seccionError });
      return;
    }

    const persona = await prisma.personaDetectada.create({
      data: {
        detectadoId,
        nombre: data.nombre,
        primerApellido: data.primerApellido,
        segundoApellido: data.segundoApellido || null,
        fechaNacimiento: new Date(data.fechaNacimiento),
        sexo: data.sexo || null,
        claveElector: data.claveElector || null,
        curp: data.curp || null,
        seccionElectoral: data.seccionElectoral,
        colonia: data.colonia,
        calle: data.calle,
        numeroExterior: data.numeroExterior,
        numeroInterior: data.numeroInterior || null,
        codigoPostal: data.codigoPostal,
        ineFrenteUrl: data.ineFrenteUrl,
        ineReversoUrl: data.ineReversoUrl,
      },
    });

    res.status(201).json(serializePersona(persona));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al registrar persona" });
  }
});

router.get("/:id/personas/:personaId", requireAuth, async (req, res) => {
  try {
    const detectadoId = paramId(req.params.id);
    const personaId = paramId(req.params.personaId);

    if (!req.user || !(await canManageDetectadoPersonas(req.user, detectadoId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const persona = await prisma.personaDetectada.findFirst({
      where: { id: personaId, detectadoId },
    });
    if (!persona) {
      res.status(404).json({ error: "Persona no encontrada" });
      return;
    }

    res.json(serializePersona(persona));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener persona" });
  }
});

router.put("/:id/personas/:personaId", requireAuth, async (req, res) => {
  try {
    const detectadoId = paramId(req.params.id);
    const personaId = paramId(req.params.personaId);

    if (!req.user || !(await canManageDetectadoPersonas(req.user, detectadoId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const data = await personaDetectadaSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const seccionError = await validarSeccionPersona(detectadoId, data.seccionElectoral);
    if (seccionError) {
      res.status(400).json({ error: seccionError });
      return;
    }

    const existing = await prisma.personaDetectada.findFirst({
      where: { id: personaId, detectadoId },
    });
    if (!existing) {
      res.status(404).json({ error: "Persona no encontrada" });
      return;
    }

    const persona = await prisma.personaDetectada.update({
      where: { id: personaId },
      data: {
        nombre: data.nombre,
        primerApellido: data.primerApellido,
        segundoApellido: data.segundoApellido || null,
        fechaNacimiento: new Date(data.fechaNacimiento),
        sexo: data.sexo || null,
        claveElector: data.claveElector || null,
        curp: data.curp || null,
        seccionElectoral: data.seccionElectoral,
        colonia: data.colonia,
        calle: data.calle,
        numeroExterior: data.numeroExterior,
        numeroInterior: data.numeroInterior || null,
        codigoPostal: data.codigoPostal,
        ineFrenteUrl: data.ineFrenteUrl,
        ineReversoUrl: data.ineReversoUrl,
      },
    });

    res.json(serializePersona(persona));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al actualizar persona" });
  }
});

router.delete("/:id/personas/:personaId", requireAuth, async (req, res) => {
  try {
    const detectadoId = paramId(req.params.id);
    const personaId = paramId(req.params.personaId);

    if (!req.user || !(await canManageDetectadoPersonas(req.user, detectadoId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const existing = await prisma.personaDetectada.findFirst({
      where: { id: personaId, detectadoId },
    });
    if (!existing) {
      res.status(404).json({ error: "Persona no encontrada" });
      return;
    }

    const persona = await prisma.personaDetectada.update({
      where: { id: personaId },
      data: { activo: false },
    });

    res.json(serializePersona(persona));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al dar de baja persona" });
  }
});

export default router;
