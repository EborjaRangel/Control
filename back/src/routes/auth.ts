import { Router } from "express";
import { ValidationError } from "yup";
import { prisma } from "../lib/prisma.js";
import {
  clearAuthCookie,
  enrichSessionUser,
  hashPassword,
  readTokenFromRequest,
  requireAuth,
  signToken,
  verifyPassword,
  verifyToken,
} from "../lib/auth.js";
import { loginSchema } from "../lib/auth-validation.js";
import { auditarCierreSesion, auditarInicioSesion } from "../lib/audit.js";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { username, password } = await loginSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const usernameNorm = username.toLowerCase();

    const usuario = await prisma.usuario.findUnique({
      where: { username: usernameNorm },
      include: {
        dirigente: { select: { id: true, activo: true } },
        rc: { select: { id: true, activo: true } },
        rg: { select: { id: true, activo: true } },
      },
    });

    if (!usuario || !usuario.activo) {
      await auditarInicioSesion(req, {
        exito: false,
        username: usernameNorm,
        motivo: "credenciales_invalidas",
      });
      res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      return;
    }

    const authUser = {
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      dirigenteId: usuario.dirigenteId,
      rcId: usuario.rcId,
      rgId: usuario.rgId,
    };

    if (usuario.rol === "DETECTADO") {
      await auditarInicioSesion(req, {
        exito: false,
        username: usuario.username,
        usuarioId: usuario.id,
        rol: usuario.rol,
        motivo: "rol_detectado_sin_acceso",
        usuario: authUser,
      });
      res.status(403).json({ error: "Los detectados no tienen acceso al sistema" });
      return;
    }

    if (usuario.rol === "DIRIGENTE" && usuario.dirigente && !usuario.dirigente.activo) {
      await auditarInicioSesion(req, {
        exito: false,
        username: usuario.username,
        usuarioId: usuario.id,
        rol: usuario.rol,
        motivo: "dirigente_inactivo",
        usuario: authUser,
      });
      res.status(403).json({ error: "Tu cuenta de dirigente está dada de baja" });
      return;
    }

    if (usuario.rol === "RC" && usuario.rc && !usuario.rc.activo) {
      await auditarInicioSesion(req, {
        exito: false,
        username: usuario.username,
        usuarioId: usuario.id,
        rol: usuario.rol,
        motivo: "rc_inactivo",
        usuario: authUser,
      });
      res.status(403).json({ error: "Tu cuenta de RC está dada de baja" });
      return;
    }

    if (usuario.rol === "RG" && usuario.rg && !usuario.rg.activo) {
      await auditarInicioSesion(req, {
        exito: false,
        username: usuario.username,
        usuarioId: usuario.id,
        rol: usuario.rol,
        motivo: "rg_inactivo",
        usuario: authUser,
      });
      res.status(403).json({ error: "Tu cuenta de RG está dada de baja" });
      return;
    }

    const ok = await verifyPassword(password, usuario.passwordHash);
    if (!ok) {
      await auditarInicioSesion(req, {
        exito: false,
        username: usuario.username,
        usuarioId: usuario.id,
        rol: usuario.rol,
        motivo: "password_incorrecta",
        usuario: authUser,
      });
      res.status(401).json({ error: "Usuario o contraseña incorrectos" });
      return;
    }

    const token = signToken(authUser);

    clearAuthCookie(res);
    const session = await enrichSessionUser(authUser);

    await auditarInicioSesion(req, {
      exito: true,
      username: usuario.username,
      usuarioId: usuario.id,
      rol: usuario.rol,
      usuario: authUser,
    });

    res.json({
      token,
      ...session,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
});

router.post("/logout", async (req, res) => {
  const token = readTokenFromRequest(req);
  const payload = token ? verifyToken(token) : null;
  if (payload) {
    await auditarCierreSesion(req, payload);
  }
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.user!.sub },
    select: {
      id: true,
      username: true,
      rol: true,
      activo: true,
      dirigenteId: true,
      rcId: true,
      rgId: true,
    },
  });

  if (!usuario || !usuario.activo) {
    clearAuthCookie(res);
    res.status(401).json({ error: "Sesión inválida" });
    return;
  }

  res.json(
    await enrichSessionUser({
      sub: usuario.id,
      rol: usuario.rol,
      username: usuario.username,
      dirigenteId: usuario.dirigenteId,
      rcId: usuario.rcId,
      rgId: usuario.rgId,
    }),
  );
});

export default router;
