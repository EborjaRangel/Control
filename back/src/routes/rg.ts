import { Router } from "express";
import { ValidationError } from "yup";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
  canAccessRg,
  canManageRgRequest,
  hashPassword,
  isStaffRol,
  requireStaff,
  requireAuth,
} from "../lib/auth.js";
import {
  representanteCreateData,
  serializeRg,
  serializeRepresentante,
} from "../lib/serialize-rc-rg.js";
import {
  cargarDirigenteParaOperador,
  datosRgDesdeDirigente,
} from "../lib/operador-dirigente.js";
import {
  validarColoniaEnDistritoLocal,
  validarSeccionParaColonia,
} from "../lib/unidades-territoriales.js";
import { nombreColoniaCatalogo } from "../lib/colonias.js";
import {
  rgCreateSchema,
  rgUpdateSchema,
  representanteCasillaSchema,
} from "../lib/validation-rc-rg.js";
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

const rgInclude = {
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

async function validarColoniaRepresentanteRg(rgId: string, colonia: string) {
  const rg = await prisma.responsableGeneral.findUnique({
    where: { id: rgId },
    select: {
      activo: true,
      dirigente: { select: { distritoLocal: true } },
    },
  });
  if (!rg || !rg.activo) return "Responsable general no encontrado o inactivo";
  return validarColoniaEnDistritoLocal(colonia, rg.dirigente?.distritoLocal);
}

async function validarSeccionRepresentanteRg(
  seccionElectoral: string,
  coloniaSeccion: string,
) {
  return validarSeccionParaColonia(nombreColoniaCatalogo(coloniaSeccion), seccionElectoral);
}

router.get("/", async (req, res) => {
  try {
    const user = req.user!;
    const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim() : "";
    const incluirBajas = req.query.incluirBajas === "true";

    if (user.rol === "RG") {
      if (!user.rgId) {
        res.status(403).json({ error: "Cuenta RG sin registro vinculado" });
        return;
      }
      const rg = await prisma.responsableGeneral.findUnique({
        where: { id: user.rgId },
        include: rgInclude,
      });
      res.json(rg ? [serializeRg(rg, { revealPassword: false })] : []);
      return;
    }

    if (!isStaffRol(user.rol)) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const lista = await prisma.responsableGeneral.findMany({
      where: {
        ...(incluirBajas ? {} : { activo: true }),
        ...(buscar
          ? {
              OR: [
                { nombre: { contains: buscar, mode: "insensitive" } },
                { primerApellido: { contains: buscar, mode: "insensitive" } },
                { segundoApellido: { contains: buscar, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: rgInclude,
      orderBy: [{ activo: "desc" }, { primerApellido: "asc" }],
    });

    res.json(lista.map((r) => serializeRg(r, { revealPassword: true })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar RG" });
  }
});

router.post("/", requireStaff, async (req, res) => {
  try {
    const data = await rgCreateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });

    const dirigente = await cargarDirigenteParaOperador(data.dirigenteId);
    if (!dirigente) {
      res.status(400).json({ error: "Dirigente no encontrado o dado de baja" });
      return;
    }
    if (dirigente.responsableGeneral) {
      res.status(409).json({ error: "Este dirigente ya tiene un responsable general asignado" });
      return;
    }

    const credenciales = resolverCredencialesCrear({
      usuario: data.usuario,
      password: data.password,
      nombre: dirigente.nombre,
      primerApellido: dirigente.primerApellido,
    });

    const rg = await prisma.$transaction(async (tx) => {
      const username = await resolverUsernameUnico(
        tx,
        dirigente.nombre,
        dirigente.primerApellido,
        { preferido: credenciales.username },
      );
      const created = await tx.responsableGeneral.create({
        data: datosRgDesdeDirigente(dirigente),
      });
      await tx.usuario.create({
        data: {
          username,
          passwordHash: await hashPassword(credenciales.password),
          passwordPlano: credenciales.password,
          rol: "RG",
          rgId: created.id,
        },
      });
      return tx.responsableGeneral.findUniqueOrThrow({ where: { id: created.id }, include: rgInclude });
    });

    res.status(201).json(serializeRg(rg, { revealPassword: true }));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    if (handleUniqueUsername(error, res)) return;
    console.error(error);
    res.status(500).json({ error: "Error al crear RG" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    if (!(await canAccessRg(req, id))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const rg = await prisma.responsableGeneral.findUnique({
      where: { id },
      include: {
        ...rgInclude,
        representantes: { where: { activo: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!rg) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    res.json(serializeRg(rg, { revealPassword: isStaffRol(req.user!.rol) }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener RG" });
  }
});

router.put("/:id", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const data = await rgUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    const existing = await prisma.responsableGeneral.findUnique({
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

    const rg = await prisma.$transaction(async (tx) => {
      await tx.responsableGeneral.update({
        where: { id },
        data: {
          nombre: data.nombre,
          primerApellido: data.primerApellido,
          segundoApellido: data.segundoApellido || null,
          telefonoCelular: data.telefonoCelular || null,
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
      return tx.responsableGeneral.findUniqueOrThrow({
        where: { id },
        include: { ...rgInclude, representantes: { where: { activo: true } } },
      });
    });

    res.json(serializeRg(rg, { revealPassword: true }));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    if (handleUniqueUsername(error, res)) return;
    console.error(error);
    res.status(500).json({ error: "Error al actualizar RG" });
  }
});

router.delete("/:id", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const reactivar = req.query.reactivar === "true";
    const rg = await prisma.responsableGeneral.update({
      where: { id },
      data: { activo: reactivar },
      include: rgInclude,
    });
    res.json(serializeRg(rg, { revealPassword: true }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
});

router.post("/:id/representantes", async (req, res) => {
  try {
    const rgId = paramId(req.params.id);
    if (!(await canManageRgRequest(req, rgId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const data = await representanteCasillaSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const coloniaError = await validarColoniaRepresentanteRg(rgId, data.colonia);
    if (coloniaError) {
      res.status(400).json({ error: coloniaError });
      return;
    }
    const seccionError = await validarSeccionRepresentanteRg(
      data.seccionElectoral,
      data.coloniaSeccion ?? data.colonia,
    );
    if (seccionError) {
      res.status(400).json({ error: seccionError });
      return;
    }
    const rep = await prisma.representanteCasilla.create({
      data: { responsableGeneralId: rgId, ...representanteCreateData(data) },
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
    const rgId = paramId(req.params.id);
    const repId = paramId(req.params.repId);
    if (!(await canAccessRg(req, rgId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const rep = await prisma.representanteCasilla.findFirst({
      where: { id: repId, responsableGeneralId: rgId },
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
    const rgId = paramId(req.params.id);
    const repId = paramId(req.params.repId);
    if (!(await canManageRgRequest(req, rgId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const data = await representanteCasillaSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    const coloniaError = await validarColoniaRepresentanteRg(rgId, data.colonia);
    if (coloniaError) {
      res.status(400).json({ error: coloniaError });
      return;
    }
    const seccionError = await validarSeccionRepresentanteRg(
      data.seccionElectoral,
      data.coloniaSeccion ?? data.colonia,
    );
    if (seccionError) {
      res.status(400).json({ error: seccionError });
      return;
    }
    const existing = await prisma.representanteCasilla.findFirst({
      where: { id: repId, responsableGeneralId: rgId },
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
    const rgId = paramId(req.params.id);
    const repId = paramId(req.params.repId);
    if (!(await canManageRgRequest(req, rgId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }
    const existing = await prisma.representanteCasilla.findFirst({
      where: { id: repId, responsableGeneralId: rgId },
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
