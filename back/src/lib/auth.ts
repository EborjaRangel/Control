import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { RolUsuario } from "../generated/prisma/client.js";
import {
  canAccessDirigentePanel,
  canManageRc,
  canManageRg,
  canViewRc,
  canViewRg,
  resolveUserPanel,
} from "./user-panel.js";

export type { UserPanelContext } from "./user-panel.js";
export { resolveUserPanel } from "./user-panel.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-cambiar-en-produccion";
const TOKEN_COOKIE = "control_token";
const TOKEN_TTL = "7d";

export type AuthPayload = {
  sub: string;
  rol: RolUsuario;
  username: string;
  dirigenteId?: string | null;
  detectadoId?: string | null;
  rcId?: string | null;
  rgId?: string | null;
};

export type AuthUser = AuthPayload;

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(TOKEN_COOKIE, { path: "/" });
}

export function readTokenFromRequest(req: Request) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }

  const cookieHeader = req.headers.cookie ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Sesión inválida o expirada" });
    return;
  }
  req.user = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.rol !== "ADMIN") {
    res.status(403).json({ error: "Se requiere rol de administrador" });
    return;
  }
  next();
}

export async function canAccessDirigente(req: Request, dirigenteId: string) {
  if (!req.user) return false;
  return canAccessDirigentePanel(req.user, dirigenteId);
}

export async function canAccessRc(req: Request, rcId: string) {
  if (!req.user) return false;
  return canViewRc(req.user, rcId);
}

export async function canAccessRg(req: Request, rgId: string) {
  if (!req.user) return false;
  return canViewRg(req.user, rgId);
}

export async function canManageRcRequest(req: Request, rcId: string) {
  if (!req.user) return false;
  return canManageRc(req.user, rcId);
}

export async function canManageRgRequest(req: Request, rgId: string) {
  if (!req.user) return false;
  return canManageRg(req.user, rgId);
}

export async function enrichSessionUser(user: AuthUser) {
  const panel = await resolveUserPanel(user);
  return {
    id: user.sub,
    username: user.username,
    rol: user.rol,
    dirigenteId: panel.dirigenteId,
    rcId: panel.rcId,
    rgId: panel.rgId,
  };
}
