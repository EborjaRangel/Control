import { Router } from "express";
import { ValidationError } from "yup";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
  canAccessRc,
  canManageRcRequest,
  hashPassword,
  isStaffRol,
  requireStaff,
  requireAuth,
} from "../lib/auth.js";
import { canCreateOperadorForDirigente } from "../lib/user-panel.js";
import {
  representanteCreateData,
  serializeRc,
  serializeRepresentante,
} from "../lib/serialize-rc-rg.js";
import {
  cargarDirigenteParaOperador,
  datosRcDesdeDirigente,
  ensureRcForDirigente,
} from "../lib/operador-dirigente.js";
import {
  rcCreateSchema,
  rcUpdateSchema,
  representanteCasillaSchema,
} from "../lib/validation-rc-rg.js";
import { nombreColoniaCatalogo, variantesColoniaParaBusqueda } from "../lib/colonias.js";
import { normalizarTextoGuardado } from "../lib/normalizar-texto.js";
import { validarSeccionParaColonia } from "../lib/unidades-territoriales.js";
import {
  dirigenteResumenSelect,
  serializeDirigenteRepresentantes,
} from "../lib/serialize-dirigente-rc.js";
import {
  normalizeUsername,
  resolverCredencialesCrear,
  resolverUsernameUnico,
} from "../lib/credenciales-usuario.js";

const router = Router();
router.use(requireAuth);

function paramId(v: string | string[]) {
  return Array.isArray(v) ? v[0] : v;
}


function handleUniqueUsername(error: unknown, res: import("express").Response) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    res.status(409).json({ error: "El nombre de usuario ya está en uso" });
    return true;
  }
  return false;
}

const rcInclude = {
  usuario: { select: { username: true, passwordPlano: true } },
  _count: { select: { representantes: { where: { activo: true } } } },
  dirigente: {
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
      tipo: true,
      colonia: true,
      seccionElectoral: true,
      distritoLocal: true,
      unidadTerritorial: { select: { id: true, clave: true, nombre: true, tipoUt: true } },
    },
  },
} as const;

async function validarColoniaRepresentante(rcId: string, colonia: string) {
  const rc = await prisma.responsableColonia.findUnique({
    where: { id: rcId },
    select: { colonia: true, activo: true },
  });
  if (!rc || !rc.activo) return "Responsable de casilla no encontrado o inactivo";
  if (normalizarTextoGuardado(colonia) !== normalizarTextoGuardado(rc.colonia)) {
    return `El representante debe vivir en la colonia ${nombreColoniaCatalogo(rc.colonia)}`;
  }
  return null;
}

async function validarSeccionRepresentanteRc(rcId: string, seccionElectoral: string) {
  const rc = await prisma.responsableColonia.findUnique({
    where: { id: rcId },
    select: { colonia: true, activo: true },
  });
  if (!rc || !rc.activo) return "Responsable de casilla no encontrado o inactivo";
  return validarSeccionParaColonia(nombreColoniaCatalogo(rc.colonia), seccionElectoral);
}

router.get("/", async (req, res) => {
  try {
    const user = req.user!;
    const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim() : "";
    const coloniaQuery =
      typeof req.query.colonia === "string" ? req.query.colonia.trim() : "";
    const coloniaFiltro = coloniaQuery
      ? variantesColoniaParaBusqueda(coloniaQuery)
      : [];
    const incluirBajas = req.query.incluirBajas === "true";

    if (user.rol === "RC") {
      if (!user.rcId) {
        res.status(403).json({ error: "Cuenta RC sin registro vinculado" });
        return;
      }
      const rc = await prisma.responsableColonia.findUnique({
        where: { id: user.rcId },
        include: rcInclude,
      });
      res.json(rc ? [serializeRc(rc, { revealPassword: false })] : []);
      return;
    }

    if (!isStaffRol(user.rol)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const lista = await prisma.responsableColonia.findMany({
      where: {
        ...(incluirBajas ? {} : { activo: true }),
        ...(coloniaFiltro.length > 0 ? { colonia: { in: coloniaFiltro } } : {}),
        ...(buscar
          ? {
              OR: [
                { nombre: { contains: buscar, mode: "insensitive" } },
                { primerApellido: { contains: buscar, mode: "insensitive" } },
                { segundoApellido: { contains: buscar, mode: "insensitive" } },
                { colonia: { contains: buscar, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: rcInclude,
      orderBy: [{ activo: "desc" }, { primerApellido: "asc" }],
    });

    res.json(lista.map((r) => serializeRc(r, { revealPassword: true })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar RC" });
  }
});

router.get("/dirigentes", requireStaff, async (req, res) => {
  try {
    const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim() : "";
    const coloniaQuery =
      typeof req.query.colonia === "string" ? req.query.colonia.trim() : "";
    const coloniaFiltro = coloniaQuery
      ? variantesColoniaParaBusqueda(coloniaQuery)
      : [];
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
        responsableColonia: {
          select: {
            id: true,
            activo: true,
            _count: { select: { representantes: { where: { activo: true } } } },
          },
        },
      },
      orderBy: [{ activo: "desc" }, { primerApellido: "asc" }],
    });

    res.json(dirigentes.map(serializeDirigenteRepresentantes));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar dirigentes" });
  }
});

router.post("/por-dirigente/:dirigenteId", requireAuth, async (req, res) => {
  try {
    const dirigenteId = paramId(req.params.dirigenteId);
    if (!req.user || !(await canCreateOperadorForDirigente(req.user, dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const existing = await prisma.responsableColonia.findFirst({
      where: { dirigenteId },
      select: { id: true },
    });
    const rc = await ensureRcForDirigente(dirigenteId);
    if (!rc) {
      res.status(404).json({ error: "Dirigente no encontrado o dado de baja" });
      return;
    }
    const full = await prisma.responsableColonia.findUniqueOrThrow({
      where: { id: rc.id },
      include: rcInclude,
    });
    res.status(existing ? 200 : 201).json(serializeRc(full, { revealPassword: false }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al preparar Rep. Casilla" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const data = await rcCreateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    if (!req.user || !(await canCreateOperadorForDirigente(req.user, data.dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const dirigente = await cargarDirigenteParaOperador(data.dirigenteId);
    if (!dirigente) {
      res.status(400).json({ error: "Dirigente no encontrado o dado de baja" });
      return;
    }
    if (dirigente.responsableColonia) {
      res.status(409).json({ error: "Este dirigente ya tiene un responsable de casilla asignado" });
      return;
    }

    const credenciales = resolverCredencialesCrear({
      usuario: data.usuario,
      password: data.password,
      nombre: dirigente.nombre,
      primerApellido: dirigente.primerApellido,
    });

    const rc = await prisma.$transaction(async (tx) => {
      const username = await resolverUsernameUnico(
        tx,
        dirigente.nombre,
        dirigente.primerApellido,
        { preferido: credenciales.username },
      );
      const created = await tx.responsableColonia.create({
        data: datosRcDesdeDirigente(dirigente),
      });
      await tx.usuario.create({
        data: {
          username,
          passwordHash: await hashPassword(credenciales.password),
          passwordPlano: credenciales.password,
          rol: "RC",
          rcId: created.id,
        },
      });
      return tx.responsableColonia.findUniqueOrThrow({ where: { id: created.id }, include: rcInclude });
    });

    res.status(201).json(serializeRc(rc, { revealPassword: isStaffRol(req.user!.rol) }));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    if (handleUniqueUsername(error, res)) return;
    console.error(error);
    res.status(500).json({ error: "Error al crear RC" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    if (!(await canAccessRc(req, id))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const rc = await prisma.responsableColonia.findUnique({
      where: { id },
      include: {
        ...rcInclude,
        representantes: { where: { activo: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!rc) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    res.json(serializeRc(rc, { revealPassword: isStaffRol(req.user!.rol) }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener RC" });
  }
});

router.put("/:id", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const data = await rcUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    const existing = await prisma.responsableColonia.findUnique({
      where: { id },
      include: { usuario: true },
    });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    const usernameRaw = data.usuario?.trim();
    const username = usernameRaw ? normalizeUsername(usernameRaw) : "";
    const password = data.password || undefined;
    const usernameActual = existing.usuario?.username ?? null;

    const rc = await prisma.$transaction(async (tx) => {
      await tx.responsableColonia.update({
        where: { id },
        data: {
          nombre: data.nombre,
          primerApellido: data.primerApellido,
          segundoApellido: data.segundoApellido || null,
          telefonoCelular: data.telefonoCelular || null,
          colonia: data.colonia,
        },
      });
      if (
        existing.usuario &&
        ((username && username !== usernameActual) || password)
      ) {
        await tx.usuario.update({
          where: { id: existing.usuario.id },
          data: {
            ...(username && username !== usernameActual ? { username } : {}),
            ...(password
              ? { passwordHash: await hashPassword(password), passwordPlano: password }
              : {}),
          },
        });
      }
      return tx.responsableColonia.findUniqueOrThrow({
        where: { id },
        include: { ...rcInclude, representantes: { where: { activo: true } } },
      });
    });

    res.json(serializeRc(rc, { revealPassword: true }));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    if (handleUniqueUsername(error, res)) return;
    console.error(error);
    res.status(500).json({ error: "Error al actualizar RC" });
  }
});

router.delete("/:id", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const reactivar = req.query.reactivar === "true";
    const rc = await prisma.responsableColonia.update({
      where: { id },
      data: { activo: reactivar },
      include: rcInclude,
    });
    res.json(serializeRc(rc, { revealPassword: true }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
});

router.post("/:id/representantes", async (req, res) => {
  try {
    const rcId = paramId(req.params.id);
    if (!(await canManageRcRequest(req, rcId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const data = await representanteCasillaSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const coloniaError = await validarColoniaRepresentante(rcId, data.colonia);
    if (coloniaError) {
      res.status(400).json({ error: coloniaError });
      return;
    }
    const seccionError = await validarSeccionRepresentanteRc(rcId, data.seccionElectoral);
    if (seccionError) {
      res.status(400).json({ error: seccionError });
      return;
    }
    const rep = await prisma.representanteCasilla.create({
      data: { responsableColoniaId: rcId, ...representanteCreateData(data) },
    });
    res.status(201).json(serializeRepresentante(rep));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al registrar representante" });
  }
});

router.get("/:id/representantes/:repId", async (req, res) => {
  try {
    const rcId = paramId(req.params.id);
    const repId = paramId(req.params.repId);
    if (!(await canAccessRc(req, rcId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const rep = await prisma.representanteCasilla.findFirst({
      where: { id: repId, responsableColoniaId: rcId },
    });
    if (!rep) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    res.json(serializeRepresentante(rep));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener representante" });
  }
});

router.put("/:id/representantes/:repId", async (req, res) => {
  try {
    const rcId = paramId(req.params.id);
    const repId = paramId(req.params.repId);
    if (!(await canManageRcRequest(req, rcId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const data = await representanteCasillaSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const coloniaError = await validarColoniaRepresentante(rcId, data.colonia);
    if (coloniaError) {
      res.status(400).json({ error: coloniaError });
      return;
    }
    const seccionError = await validarSeccionRepresentanteRc(rcId, data.seccionElectoral);
    if (seccionError) {
      res.status(400).json({ error: seccionError });
      return;
    }
    const existing = await prisma.representanteCasilla.findFirst({
      where: { id: repId, responsableColoniaId: rcId },
    });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    const rep = await prisma.representanteCasilla.update({
      where: { id: repId },
      data: representanteCreateData(data),
    });
    res.json(serializeRepresentante(rep));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al actualizar representante" });
  }
});

router.delete("/:id/representantes/:repId", async (req, res) => {
  try {
    const rcId = paramId(req.params.id);
    const repId = paramId(req.params.repId);
    if (!(await canManageRcRequest(req, rcId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const existing = await prisma.representanteCasilla.findFirst({
      where: { id: repId, responsableColoniaId: rcId },
    });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    const rep = await prisma.representanteCasilla.update({
      where: { id: repId },
      data: { activo: false },
    });
    res.json(serializeRepresentante(rep));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al dar de baja representante" });
  }
});

export default router;
