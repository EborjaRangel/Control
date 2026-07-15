import { prisma } from "./prisma.js";
import type { AuthUser } from "./auth.js";

export type UserPanelContext = {
  dirigenteId: string | null;
  rcId: string | null;
  rgId: string | null;
};

export async function resolveUserPanel(user: AuthUser): Promise<UserPanelContext> {
  let dirigenteId = user.dirigenteId ?? null;
  let rcId = user.rcId ?? null;
  let rgId = user.rgId ?? null;

  if (user.rcId && !dirigenteId) {
    const rc = await prisma.responsableColonia.findUnique({
      where: { id: user.rcId },
      select: { dirigenteId: true },
    });
    dirigenteId = rc?.dirigenteId ?? null;
  }

  if (user.rgId && !dirigenteId) {
    const rg = await prisma.responsableGeneral.findUnique({
      where: { id: user.rgId },
      select: { dirigenteId: true },
    });
    dirigenteId = rg?.dirigenteId ?? null;
  }

  if (dirigenteId) {
    if (!rcId) {
      const rc = await prisma.responsableColonia.findFirst({
        where: { dirigenteId, activo: true },
        select: { id: true },
      });
      rcId = rc?.id ?? null;
    }
    if (!rgId) {
      const rg = await prisma.responsableGeneral.findFirst({
        where: { dirigenteId, activo: true },
        select: { id: true },
      });
      rgId = rg?.id ?? null;
    }
  }

  return { dirigenteId, rcId, rgId };
}

export async function canAccessDirigentePanel(
  user: AuthUser,
  dirigenteId: string,
): Promise<boolean> {
  if (user.rol === "ADMIN" || user.rol === "SUPERVISOR") return true;
  const panel = await resolveUserPanel(user);
  return panel.dirigenteId === dirigenteId;
}

export async function canManageRc(user: AuthUser, rcId: string): Promise<boolean> {
  if (user.rol === "ADMIN" || user.rol === "SUPERVISOR") return true;
  if (user.rol === "RC" && user.rcId === rcId) return true;
  if (user.rol === "DIRIGENTE") {
    const panel = await resolveUserPanel(user);
    return panel.rcId === rcId;
  }
  return false;
}

export async function canViewRc(user: AuthUser, rcId: string): Promise<boolean> {
  if (user.rol === "ADMIN" || user.rol === "SUPERVISOR") return true;
  if (user.rol === "RC" && user.rcId === rcId) return true;
  const panel = await resolveUserPanel(user);
  return panel.rcId === rcId;
}

export async function canManageRg(user: AuthUser, rgId: string): Promise<boolean> {
  if (user.rol === "ADMIN" || user.rol === "SUPERVISOR") return true;
  if (user.rol === "RG" && user.rgId === rgId) return true;
  if (user.rol === "DIRIGENTE") {
    const panel = await resolveUserPanel(user);
    return panel.rgId === rgId;
  }
  return false;
}

export async function canViewRg(user: AuthUser, rgId: string): Promise<boolean> {
  if (user.rol === "ADMIN" || user.rol === "SUPERVISOR") return true;
  if (user.rol === "RG" && user.rgId === rgId) return true;
  const panel = await resolveUserPanel(user);
  return panel.rgId === rgId;
}
