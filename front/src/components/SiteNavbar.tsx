"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { BellIcon } from "@/components/BellIcon";
import { CoyoteLogo } from "@/components/CoyoteLogo";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { APP_TITLE, NAVBAR_TITLE } from "@/lib/site";
import { brandHrefForUser, navItemsForUser } from "@/lib/mi-panel";
import { canAccessPrivilegedStaffNav, isAdminRol, isLimitedPanelRol, isStaffRol } from "@/lib/auth";

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
    shortLabel: "Dirigentes",
    match: (p: string) => p === "/" || p.startsWith("/dirigentes/"),
  },
  {
    href: "/mapa",
    label: "Mapa",
    shortLabel: "Mapa",
    match: (p: string) => p.startsWith("/mapa"),
  },
  {
    href: "/electoral",
    label: "Electoral",
    shortLabel: "Electoral",
    match: (p: string) => p.startsWith("/electoral"),
  },
  {
    href: "/asistencia",
    label: "Asistencia",
    shortLabel: "Asistencia",
    match: (p: string) => p.startsWith("/asistencia"),
  },
  {
    href: "/convocatoria",
    label: "Convocatoria",
    shortLabel: "Convocatoria",
    match: (p: string) => p.startsWith("/convocatoria"),
  },
  {
    href: "/nominas",
    label: "Nóminas",
    shortLabel: "Nóminas",
    match: (p: string) => p.startsWith("/nominas"),
  },
  {
    href: "/detectados",
    label: "Detectados",
    shortLabel: "Detectados",
    match: (p: string) => p.startsWith("/detectados"),
  },
  {
    href: "/servicios-urbanos",
    label: "Servicios urbanos",
    shortLabel: "Servicios",
    match: (p: string) => p.startsWith("/servicios-urbanos"),
  },
  {
    href: "/rc",
    label: "Rep. Casilla",
    shortLabel: "Rep. Casilla",
    match: (p: string) => p === "/rc" || p.startsWith("/rc/"),
  },
  {
    href: "/rg",
    label: "Rep. General",
    shortLabel: "Rep. General",
    match: (p: string) => p === "/rg" || p.startsWith("/rg/"),
  },
  {
    href: "/usuarios",
    label: "Usuarios",
    shortLabel: "Usuarios",
    match: (p: string) => p.startsWith("/usuarios"),
  },
  {
    href: "/auditoria",
    label: "Auditoría",
    shortLabel: "Auditoría",
    match: (p: string) => p.startsWith("/auditoria"),
  },
  {
    href: "/analisis",
    label: "Análisis",
    shortLabel: "Análisis",
    match: (p: string) => p.startsWith("/analisis"),
  },
] as const;

const PRIVILEGED_NAV_HREFS = new Set<string>(["/nominas", "/usuarios", "/auditoria"]);
const ADMIN_ONLY_NAV_HREFS = new Set<string>(["/analisis"]);

function staffMainNavForRol(rol: Parameters<typeof canAccessPrivilegedStaffNav>[0]) {
  if (!isStaffRol(rol)) return [];
  let items: typeof ADMIN_NAV[number][] = [...ADMIN_NAV];
  if (!canAccessPrivilegedStaffNav(rol)) {
    items = items.filter((item) => !PRIVILEGED_NAV_HREFS.has(item.href));
  }
  if (!isAdminRol(rol)) {
    items = items.filter((item) => !ADMIN_ONLY_NAV_HREFS.has(item.href));
  }
  return items;
}

function navGridColumns(count: number) {
  if (count <= 5) return count;
  if (count <= 6) return 3;
  return 5;
}

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

  const text = isNotificaciones ? shortLabel : label;

  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      aria-label={isNotificaciones ? label : undefined}
      className={classes}
    >
      <span
        className={cn(
          "relative inline-flex w-full flex-col items-center justify-center gap-0.5",
          isNotificaciones && "gap-0.5",
        )}
      >
        {isNotificaciones ? (
          <BellIcon className="nav-bell size-4 shrink-0" filled={showBadge || active} />
        ) : null}
        <span className="nav-link-label">{text}</span>
        {showBadge ? (
          <span
            className={cn(
              "nav-badge absolute -right-0.5 -top-0.5",
              isNotificaciones && "nav-badge-notificaciones",
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

function AvisosNavLink({
  active,
  badge,
}: {
  active: boolean;
  badge: number;
}) {
  const showBadge = badge > 0;
  return (
    <Link
      href="/notificaciones"
      title="Notificaciones"
      aria-current={active ? "page" : undefined}
      className={cn(
        "navbar-avisos-link",
        active && "navbar-avisos-link-active",
        showBadge && "navbar-avisos-link-unread",
      )}
    >
      <BellIcon className="nav-bell size-5 shrink-0" filled={showBadge || active} />
      <span>Avisos</span>
      {showBadge ? (
        <span className="nav-badge nav-badge-notificaciones" aria-label={`${badge} sin leer`}>
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function SiteNavbar() {
  const pathname = usePathname();
  const { user, isStaff, logout } = useAuth();
  const [noLeidas, setNoLeidas] = useState(0);
  const navRef = useRef<HTMLElement | null>(null);

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

  const allNavItems = isStaff
    ? [NOTIFICACIONES_NAV, ...staffMainNavForRol(user?.rol)]
    : user
      ? navItemsForUser(user)
      : [];

  const mainNavItems = allNavItems.filter((item) => item.href !== "/notificaciones");
  const showAvisos = Boolean(user) && !isLimitedPanelRol(user?.rol);
  const avisosActive = pathname.startsWith("/notificaciones");

  useEffect(() => {
    const root = document.documentElement;
    if (mainNavItems.length === 0) {
      root.style.removeProperty("--navbar-nav-h");
      return;
    }

    const syncNavHeight = () => {
      const nav = navRef.current;
      if (!nav) return;
      root.style.setProperty("--navbar-nav-h", `${nav.offsetHeight}px`);
    };

    syncNavHeight();
    const timer = window.setTimeout(syncNavHeight, 0);
    const nav = navRef.current;
    if (!nav) {
      return () => window.clearTimeout(timer);
    }

    const observer = new ResizeObserver(syncNavHeight);
    observer.observe(nav);
    window.addEventListener("resize", syncNavHeight);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", syncNavHeight);
    };
  }, [mainNavItems.length, pathname, user?.id, user?.rol, isStaff]);

  return (
    <header className="navbar-top">
      <div
        className={cn(
          "page-container navbar-shell",
          mainNavItems.length === 0 && "navbar-shell-no-nav",
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

        {showAvisos ? (
          <div className="navbar-center">
            <AvisosNavLink active={avisosActive} badge={noLeidas} />
          </div>
        ) : (
          <div className="navbar-center" aria-hidden />
        )}

        {mainNavItems.length > 0 ? (
          <nav
            ref={navRef}
            className={cn("navbar-nav", mainNavItems.length >= 7 && "navbar-nav-staff")}
            style={{
              gridTemplateColumns: `repeat(${navGridColumns(mainNavItems.length)}, minmax(0, 1fr))`,
            }}
            aria-label="Principal"
          >
            {mainNavItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                shortLabel={item.shortLabel}
                active={item.match(pathname)}
                compact
                destacado={"destacado" in item ? item.destacado : false}
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
