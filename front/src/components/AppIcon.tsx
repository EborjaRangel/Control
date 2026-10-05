import type { ReactNode } from "react";

export type IconName =
  | "users"
  | "user"
  | "userPlus"
  | "map"
  | "ballot"
  | "clipboard"
  | "megaphone"
  | "wrench"
  | "flag"
  | "shield"
  | "key"
  | "scroll"
  | "chart"
  | "trend"
  | "layers"
  | "group"
  | "id"
  | "logout"
  | "lock"
  | "mail"
  | "phone"
  | "calendar"
  | "camera"
  | "pin"
  | "home"
  | "grid"
  | "badge"
  | "note"
  | "coin"
  | "tag"
  | "file"
  | "search"
  | "plus"
  | "check"
  | "arrowLeft"
  | "x";

const PATHS: Record<IconName, ReactNode> = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  userPlus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </>
  ),
  map: (
    <>
      <path d="M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </>
  ),
  ballot: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="m3 6 1 1 2-2" />
      <path d="m3 12 1 1 2-2" />
      <path d="m3 18 1 1 2-2" />
    </>
  ),
  clipboard: (
    <>
      <rect width="14" height="16" x="5" y="4" rx="2" />
      <path d="M9 4.5h6a1 1 0 0 0 1-1V3H8v.5a1 1 0 0 0 1 1z" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.7 6.3a4.5 4.5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a4.5 4.5 0 0 0 6.4-6.4L15 12l-3-3 2.7-2.7z" />
    </>
  ),
  flag: (
    <>
      <path d="M4 22V4" />
      <path d="M4 4h12l-2 4 2 4H4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9" />
      <path d="M16 6h4v4" />
    </>
  ),
  scroll: (
    <>
      <path d="M8 21h12a2 2 0 0 0 2-2v-2H10" />
      <path d="M19 17V5a2 2 0 0 0-2-2H7" />
      <path d="M4 5a2 2 0 0 1 2-2h1v16H6a2 2 0 0 1-2-2V5z" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 16v-4" />
      <path d="M12 16V8" />
      <path d="M17 16v-6" />
    </>
  ),
  trend: (
    <>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M14 7h7v7" />
    </>
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5L3 7l9-5z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 17 9 5 9-5" />
    </>
  ),
  group: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  id: (
    <>
      <rect width="18" height="14" x="3" y="5" rx="2" />
      <circle cx="9" cy="12" r="2" />
      <path d="M15 10h4" />
      <path d="M15 14h3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  lock: (
    <>
      <rect width="14" height="10" x="5" y="11" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  mail: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  phone: (
    <>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.33 1.9.6 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.27 1.85.47 2.81.6A2 2 0 0 1 22 16.92z" />
    </>
  ),
  calendar: (
    <>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </>
  ),
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  grid: (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
    </>
  ),
  badge: (
    <>
      <path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  note: (
    <>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M14 3v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8" />
      <path d="M9.5 10.5c.5-1 1.4-1.5 2.5-1.5 1.4 0 2.5.7 2.5 2s-1.1 2-2.5 2-2.5.7-2.5 2 1.1 2 2.5 2c1.1 0 2-.5 2.5-1.5" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </>
  ),
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  check: (
    <>
      <path d="M20 6 9 17l-5-5" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </>
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
};

export function AppIcon({
  name,
  className = "size-4 shrink-0",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}

export function iconForNavHref(href: string): IconName {
  if (href.includes("/consultar")) return "id";
  if (href === "/" || href.startsWith("/dirigentes")) return "users";
  if (href.startsWith("/mapa")) return "map";
  if (href.startsWith("/electoral")) return "ballot";
  if (href.startsWith("/asistencia")) return "clipboard";
  if (href.startsWith("/convocatoria")) return "megaphone";
  if (href.startsWith("/detectados")) return "userPlus";
  if (href.startsWith("/servicios-urbanos")) return "wrench";
  if (href.startsWith("/rc")) return "flag";
  if (href.startsWith("/rg")) return "shield";
  if (href.startsWith("/usuarios")) return "key";
  if (href.startsWith("/auditoria")) return "scroll";
  if (href.startsWith("/analisis")) return "chart";
  if (href.startsWith("/proyeccion")) return "trend";
  if (href.startsWith("/operacion")) return "layers";
  if (href.startsWith("/asambleas")) return "group";
  if (href.startsWith("/nominas")) return "coin";
  if (href.startsWith("/comunicacion")) return "mail";
  return "file";
}

export function iconForField(name: string, type?: string): IconName | null {
  const n = name.toLowerCase();
  if (type === "password" || n.includes("password") || n.includes("contrasena") || n.includes("contraseña")) {
    return "lock";
  }
  if (type === "email" || n.includes("correo") || n.includes("email")) return "mail";
  if (n.includes("telefono") || n.includes("celular") || n.includes("whatsapp")) return "phone";
  if (n.includes("fecha") || n.includes("nacimiento") || n === "hora") return "calendar";
  if (n.includes("foto") || n.includes("imagen")) return "camera";
  if (n.includes("direccion") || n.includes("calle") || n.includes("lugar") || n.includes("numero")) return "pin";
  if (n.includes("colonia") || n.includes("alcaldia") || n.includes("municipio")) return "home";
  if (n.includes("seccion") || n.includes("distrito")) return "grid";
  if (n.includes("curp") || n.includes("ine")) return "badge";
  if (n.includes("nombre") || n.includes("apellido") || n.includes("alias")) return "user";
  if (n.includes("usuario") || n === "username") return "user";
  if (n.includes("descripcion") || n.includes("anotacion") || n.includes("observ") || n.includes("mensaje")) {
    return "note";
  }
  if (n.includes("monto") || n.includes("sueldo") || n.includes("pago") || n.includes("importe")) return "coin";
  if (n.includes("tipo") || n.includes("estatus") || n.includes("rol") || n.includes("status")) return "tag";
  if (n === "lat" || n === "lng" || n.includes("latitud") || n.includes("longitud")) return "pin";
  if (n.includes("suac") || n.includes("folio") || n.includes("referencia") || n.includes("codigo")) return "file";
  if (n.includes("buscar")) return "search";
  return null;
}

export function FieldLabel({
  name,
  type,
  children,
}: {
  name: string;
  type?: string;
  children: ReactNode;
}) {
  const icon = iconForField(name, type);
  if (!icon) return <>{children}</>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <AppIcon name={icon} className="size-3.5 shrink-0 text-pin" />
      {children}
    </span>
  );
}
