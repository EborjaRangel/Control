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
import { loginSchema, recuperarContrasenaSchema, restablecerContrasenaSchema } from "../lib/auth-validation.js";
import { auditarCierreSesion, auditarInicioSesion } from "../lib/audit.js";
import {
  buscarUsuarioPorCorreoRegistrado,
  correoRegistradoUsuario,
  crearTokenRecuperacion,
  enviarCorreoRecuperacion,
  marcarTokenRecuperacionUsado,
  normalizarCorreo,
  urlRestablecerContrasena,
  validarTokenRecuperacion,
} from "../lib/password-reset.js";
import { smtpModoDesarrolloActivo, smtpUsaValoresEjemplo, mensajeSmtpNoConfigurado } from "../lib/comunicacion/config.js";

const router = Router();

const MENSAJE_RECUPERACION_ENVIADA =
  "Si el correo está registrado en el sistema, recibirás un enlace para restablecer tu contraseña.";

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

router.post("/recuperar-contrasena", async (req, res) => {
  try {
    const { correo } = await recuperarContrasenaSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const correoNorm = normalizarCorreo(correo);
    const usuario = await buscarUsuarioPorCorreoRegistrado(correoNorm);

    if (!usuario) {
      res.json({ ok: true, mensaje: MENSAJE_RECUPERACION_ENVIADA });
      return;
    }

    const correoRegistrado = correoRegistradoUsuario(usuario);
    if (!correoRegistrado) {
      res.json({ ok: true, mensaje: MENSAJE_RECUPERACION_ENVIADA });
      return;
    }

    const token = await crearTokenRecuperacion(usuario.id);

    if (smtpUsaValoresEjemplo()) {
      if (smtpModoDesarrolloActivo()) {
        const enlace = urlRestablecerContrasena(token);
        console.log("\n[dev] Recuperación de contraseña (SMTP no configurado):");
        console.log(`  Usuario: ${usuario.username}`);
        console.log(`  Correo: ${correoRegistrado}`);
        console.log(`  Enlace: ${enlace}\n`);
        res.json({
          ok: true,
          mensaje:
            "Modo desarrollo: no se envió correo. Usa el enlace de abajo para restablecer tu contraseña.",
          devEnlace: enlace,
        });
        return;
      }

      res.status(503).json({
        error: mensajeSmtpNoConfigurado(),
      });
      return;
    }

    const envio = await enviarCorreoRecuperacion({
      to: correoRegistrado,
      username: usuario.username,
      token,
    });

    if (!envio.ok) {
      res.status(503).json({
        error:
          envio.error ??
          "No se pudo enviar el correo. Intenta más tarde o contacta al administrador.",
      });
      return;
    }

    res.json({ ok: true, mensaje: MENSAJE_RECUPERACION_ENVIADA });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al solicitar la recuperación de contraseña" });
  }
});

router.get("/restablecer-contrasena", async (req, res) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
    if (!token) {
      res.status(400).json({ error: "Enlace inválido o expirado" });
      return;
    }

    const registro = await validarTokenRecuperacion(token);
    if (!registro) {
      res.status(400).json({ error: "Enlace inválido o expirado" });
      return;
    }

    res.json({
      ok: true,
      username: registro.usuario.username,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al validar el enlace" });
  }
});

router.post("/restablecer-contrasena", async (req, res) => {
  try {
    const { token, password } = await restablecerContrasenaSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const registro = await validarTokenRecuperacion(token);
    if (!registro) {
      res.status(400).json({ error: "Enlace inválido o expirado" });
      return;
    }

    await prisma.usuario.update({
      where: { id: registro.usuario.id },
      data: {
        passwordHash: await hashPassword(password),
        passwordPlano: password,
      },
    });

    await marcarTokenRecuperacionUsado(token);

    res.json({ ok: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al restablecer la contraseña" });
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
