"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BellIcon } from "@/components/BellIcon";
import { CoyoteLogo } from "@/components/CoyoteLogo";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { APP_TITLE, NAVBAR_TITLE } from "@/lib/site";
import { brandHrefForUser, navItemsForUser } from "@/lib/mi-panel";

const NOTIFICACIONES_NAV = {
  href: "/notificaciones",
  label: "Notificaciones",
  shortLabel: "Avisos",
  match: (p: string) => p.startsWith("/notificaciones"),
  destacado: true as const,
};

const ADMIN_NAV = [
  {
    href: "/",
    label: "Dirigentes",
    shortLabel: "Lista",
    match: (p: string) => p === "/" || p.startsWith("/dirigentes/"),
  },
  {
    href: "/mapa",
    label: "Mapa",
    shortLabel: "Mapa",
    match: (p: string) => p.startsWith("/mapa"),
  },
  {
    href: "/asistencia",
    label: "Asistencia",
    shortLabel: "Asist.",
    match: (p: string) => p.startsWith("/asistencia"),
  },
  {
    href: "/convocatoria",
    label: "Convocatoria",
    shortLabel: "Convoc.",
    match: (p: string) => p.startsWith("/convocatoria"),
  },
  {
    href: "/nominas",
    label: "Nóminas",
    shortLabel: "Nóm.",
    match: (p: string) => p.startsWith("/nominas"),
  },
  {
    href: "/detectados",
    label: "Detectados",
    shortLabel: "Detec.",
    match: (p: string) => p.startsWith("/detectados"),
  },
  {
    href: "/rc",
    label: "Rep. Casilla",
    shortLabel: "Rep.",
    match: (p: string) => p === "/rc" || p.startsWith("/rc/"),
  },
  {
    href: "/rg",
    label: "Rep. General",
    shortLabel: "Gral.",
    match: (p: string) => p === "/rg" || p.startsWith("/rg/"),
  },
] as const;

type NavItemProps = {
  href: string;
  label: string;
  shortLabel: string;
  active: boolean;
  compact?: boolean;
  destacado?: boolean;
  isNotificaciones?: boolean;
  badge?: number;
};

function NavLink({
  href,
  label,
  shortLabel,
  active,
  compact,
  destacado,
  isNotificaciones,
  badge = 0,
}: NavItemProps) {
  const showBadge = badge > 0;
  const classes = cn(
    "nav-link",
    active && "nav-link-active",
    isNotificaciones ? "nav-link-notificaciones" : destacado && "nav-link-destacado",
    showBadge && "nav-link-unread",
    compact && "nav-link-compact",
  );

  const textMobile = shortLabel;
  const textDesktop = label;

  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={classes}>
      <span
        className={cn(
          "relative inline-flex items-center gap-1",
          compact && isNotificaciones && "flex-col gap-0.5 sm:flex-row",
        )}
      >
        {isNotificaciones ? (
          <BellIcon
            className={cn("nav-bell", compact ? "size-[1.125rem]" : "size-[1.125rem] sm:size-4")}
            filled={showBadge || active}
          />
        ) : null}
        <span className="sm:hidden">{textMobile}</span>
        <span className="hidden sm:inline">{textDesktop}</span>
        {showBadge ? (
          <span
            className={cn(
              "nav-badge",
              isNotificaciones && "nav-badge-notificaciones",
              compact && isNotificaciones && "absolute -right-1 -top-0.5",
            )}
            aria-label={`${badge} sin leer`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function SiteNavbar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    if (!user) {
      setNoLeidas(0);
      return;
    }
    void apiFetch("/api/notificaciones/resumen")
      .then(async (res) => (res.ok ? ((await res.json()) as { noLeidas: number }) : { noLeidas: 0 }))
      .then((data) => setNoLeidas(data.noLeidas))
      .catch(() => setNoLeidas(0));
  }, [user, pathname]);

  const navItems = isAdmin
    ? [NOTIFICACIONES_NAV, ...ADMIN_NAV]
    : user
      ? navItemsForUser(user)
      : [];

  return (
    <header className="navbar-top">
      <div
        className={cn(
          "page-container navbar-shell",
          navItems.length === 0 && "navbar-shell-no-nav",
        )}
      >
        <Link
          href={user ? brandHrefForUser(user) : "/login"}
          className="navbar-brand min-w-0"
          title={APP_TITLE}
        >
          <CoyoteLogo size={40} badge className="shrink-0" title="Coyote de Coyoacán" />
          <span className="truncate text-sm font-bold text-pin sm:text-base lg:text-lg">
            {NAVBAR_TITLE}
          </span>
        </Link>

        {navItems.length > 0 ? (
          <nav className="navbar-nav scroll-touch" aria-label="Principal">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                shortLabel={item.shortLabel}
                active={item.match(pathname)}
                compact
                destacado={"destacado" in item ? item.destacado : false}
                isNotificaciones={item.href === "/notificaciones"}
                badge={item.href === "/notificaciones" ? noLeidas : 0}
              />
            ))}
          </nav>
        ) : null}

        {user ? (
          <div className="navbar-user">
            <span className="navbar-username">{user.username}</span>
            <button type="button" className="btn-ghost btn-sm" onClick={() => void logout()}>
              Salir
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
