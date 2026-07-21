import { Router } from "express";
import { ValidationError } from "yup";
import { Prisma } from "../generated/prisma/client.js";
import { hashPassword, requireAdminPrivileges } from "../lib/auth.js";
import { normalizeUsername } from "../lib/credenciales-usuario.js";
import { prisma } from "../lib/prisma.js";
import {
  staffUserCreateSchema,
  staffUserUpdateSchema,
} from "../lib/usuarios-validation.js";
import {
  PANEL_USER_ROLES,
  esRolPanel,
  puedeAsignarRol,
  puedeModificarUsuarioStaff,
  type PanelUserRol,
} from "../lib/usuarios-permisos.js";

const router = Router();

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function serializeStaffUser(u: {
  id: string;
  username: string;
  rol: string;
  activo: boolean;
  passwordPlano: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: u.id,
    username: u.username,
    rol: u.rol,
    activo: u.activo,
    password: u.passwordPlano,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

async function countActiveAdmins(excludeId?: string) {
  return prisma.usuario.count({
    where: {
      rol: "ADMIN",
      activo: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

router.use(requireAdminPrivileges);

router.get("/", async (_req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { rol: { in: [...PANEL_USER_ROLES] } },
      orderBy: [{ rol: "asc" }, { username: "asc" }],
    });
    res.json(usuarios.map(serializeStaffUser));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar usuarios" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = await staffUserCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (!puedeAsignarRol(req.user?.rol, body.rol as PanelUserRol)) {
      res.status(403).json({ error: "Solo un administrador puede crear cuentas de administrador" });
      return;
    }

    const username = normalizeUsername(body.username);
    const existente = await prisma.usuario.findUnique({ where: { username } });
    if (existente) {
      res.status(409).json({ error: "El nombre de usuario ya está en uso" });
      return;
    }

    const passwordHash = await hashPassword(body.password);
    const usuario = await prisma.usuario.create({
      data: {
        username,
        passwordHash,
        passwordPlano: body.password,
        rol: body.rol,
        activo: true,
      },
    });

    res.status(201).json(serializeStaffUser(usuario));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const body = await staffUserUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const actual = await prisma.usuario.findFirst({
      where: { id, rol: { in: [...PANEL_USER_ROLES] } },
    });
    if (!actual || !esRolPanel(actual.rol)) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const esYo = req.user!.sub === id;
    const nuevoRol = (body.rol ?? actual.rol) as PanelUserRol;
    const nuevoActivo = body.activo ?? actual.activo;

    const permisoError = puedeModificarUsuarioStaff(req.user?.rol, actual.rol, {
      rol: body.rol as PanelUserRol | undefined,
      activo: body.activo,
    }, actual.activo);
    if (permisoError) {
      res.status(403).json({ error: permisoError });
      return;
    }

    if (esYo && nuevoRol !== actual.rol) {
      res.status(400).json({ error: "No puedes cambiar tu propio rol" });
      return;
    }
    if (esYo && !nuevoActivo) {
      res.status(400).json({ error: "No puedes desactivar tu propia cuenta" });
      return;
    }

    const otrosAdminsActivos = await countActiveAdmins(id);
    const quedaActivoAdmin = nuevoRol === "ADMIN" && nuevoActivo;
    if (!quedaActivoAdmin && actual.rol === "ADMIN" && otrosAdminsActivos < 1) {
      res.status(400).json({ error: "Debe permanecer al menos un administrador activo" });
      return;
    }

    if (body.username) {
      const username = normalizeUsername(body.username);
      if (username !== actual.username) {
        const ocupado = await prisma.usuario.findFirst({
          where: { username, id: { not: id } },
          select: { id: true },
        });
        if (ocupado) {
          res.status(409).json({ error: "El nombre de usuario ya está en uso" });
          return;
        }
      }
    }

    const data: Prisma.UsuarioUpdateInput = {};
    if (body.username) data.username = normalizeUsername(body.username);
    if (body.rol) data.rol = body.rol;
    if (body.activo !== undefined) data.activo = body.activo;
    if (body.password) {
      data.passwordHash = await hashPassword(body.password);
      data.passwordPlano = body.password;
    }

    const usuario = await prisma.usuario.update({ where: { id }, data });
    res.json(serializeStaffUser(usuario));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

export default router;
