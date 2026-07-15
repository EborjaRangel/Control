import type { SessionUser } from "@/lib/auth";

export function canManageRc(user: SessionUser | null, rcId: string) {
  if (!user) return false;
  if (user.rol === "ADMIN") return true;
  if (user.rol === "RC" && user.rcId === rcId) return true;
  return user.rol === "DIRIGENTE" && user.rcId === rcId;
}

export function canManageRg(user: SessionUser | null, rgId: string) {
  if (!user) return false;
  if (user.rol === "ADMIN") return true;
  if (user.rol === "RG" && user.rgId === rgId) return true;
  return user.rol === "DIRIGENTE" && user.rgId === rgId;
}

export function canManageDetectadosDirigente(user: SessionUser | null, dirigenteId: string) {
  return canViewOwnDirigente(user, dirigenteId);
}

function canManageRcForUser(user: SessionUser) {
  return user.rol === "RC" || (user.rol === "DIRIGENTE" && Boolean(user.rcId));
}

function canManageRgForUser(user: SessionUser) {
  return user.rol === "RG" || (user.rol === "DIRIGENTE" && Boolean(user.rgId));
}

export function canViewOwnDirigente(user: SessionUser | null, dirigenteId: string) {
  if (!user) return false;
  return user.rol === "ADMIN" || user.dirigenteId === dirigenteId;
}

function operadorAllowed(pathname: string, base: string, id: string, manage: boolean) {
  const prefix = `${base}/${id}`;
  if (pathname === prefix) return true;
  if (!pathname.startsWith(`${prefix}/representantes/`)) return false;
  if (pathname === `${prefix}/representantes/nueva`) return manage;
  if (new RegExp(`^${prefix.replace(/\//g, "\\/")}/representantes/[^/]+$`).test(pathname)) {
    return true;
  }
  return manage;
}

export function pathAllowedForUser(user: SessionUser, pathname: string) {
  if (user.rol === "ADMIN") return true;

  if (pathname === "/notificaciones" || pathname.startsWith("/notificaciones/")) {
    return true;
  }

  const { dirigenteId, rcId, rgId } = user;

  if (dirigenteId) {
    if (pathname === `/dirigentes/${dirigenteId}/consultar`) return true;
    if (pathname === `/nominas/${dirigenteId}`) return true;
    if (pathname === `/detectados/dirigentes/${dirigenteId}`) return true;
    if (pathname === `/detectados/dirigentes/${dirigenteId}/nuevo`) return true;
    if (/^\/detectados\/[^/]+$/.test(pathname) && !pathname.startsWith("/detectados/dirigentes")) {
      return true;
    }
  }

  if (rcId) {
    if (operadorAllowed(pathname, "/rc", rcId, canManageRcForUser(user))) return true;
  }

  if (rgId) {
    if (operadorAllowed(pathname, "/rg", rgId, canManageRgForUser(user))) return true;
  }

  return false;
}

export function homeForUser(user: SessionUser) {
  if (user.rol === "ADMIN") return "/";
  if (user.dirigenteId) return `/dirigentes/${user.dirigenteId}/consultar`;
  if (user.rcId) return `/rc/${user.rcId}`;
  if (user.rgId) return `/rg/${user.rgId}`;
  return "/login";
}

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  match: (pathname: string) => boolean;
  destacado?: boolean;
};

export function navItemsForUser(user: SessionUser): NavItem[] {
  const items: NavItem[] = [
    {
      href: "/notificaciones",
      label: "Notificaciones",
      shortLabel: "Avisos",
      match: (p) => p.startsWith("/notificaciones"),
      destacado: true,
    },
  ];

  if (user.dirigenteId) {
    items.push({
      href: `/dirigentes/${user.dirigenteId}/consultar`,
      label: "Mi ficha",
      shortLabel: "Ficha",
      match: (p) => p === `/dirigentes/${user.dirigenteId}/consultar`,
    });
    items.push({
      href: `/detectados/dirigentes/${user.dirigenteId}`,
      label: "Mis detectados",
      shortLabel: "Detec.",
      match: (p) =>
        p === `/detectados/dirigentes/${user.dirigenteId}` ||
        (/^\/detectados\/[^/]+$/.test(p) && !p.startsWith("/detectados/dirigentes")),
    });
  }

  if (user.rcId) {
    items.push({
      href: `/rc/${user.rcId}`,
      label: user.rol === "RC" ? "Rep. de casilla" : "Rep. Casilla",
      shortLabel: "Casilla",
      match: (p) => p.startsWith(`/rc/${user.rcId}`),
    });
  }

  if (user.rgId) {
    items.push({
      href: `/rg/${user.rgId}`,
      label: user.rol === "RG" ? "Rep. General" : "Rep. General",
      shortLabel: "Gral.",
      match: (p) => p.startsWith(`/rg/${user.rgId}`),
    });
  }

  return items;
}

export function brandHrefForUser(user: SessionUser) {
  return homeForUser(user);
}
