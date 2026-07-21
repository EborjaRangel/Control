import type { RolUsuario } from "../generated/prisma/client.js";
import { isAdminRol, isCoordinadorRol } from "./auth.js";

export const PANEL_USER_ROLES = [
  "ADMIN",
  "COORDINADOR",
  "SUPERVISOR",
  "ASISTENCIA",
  "CONVOCATORIA",
] as const;

export type PanelUserRol = (typeof PANEL_USER_ROLES)[number];

export function esRolPanel(rol: string): rol is PanelUserRol {
  return (PANEL_USER_ROLES as readonly string[]).includes(rol);
}

export function puedeAsignarRol(actorRol: RolUsuario | undefined, rolNuevo: PanelUserRol): boolean {
  if (rolNuevo === "ADMIN" && !isAdminRol(actorRol)) return false;
  return true;
}

export function puedeModificarUsuarioStaff(
  actorRol: RolUsuario | undefined,
  targetRol: PanelUserRol,
  cambios: { rol?: PanelUserRol; activo?: boolean },
): string | null {
  if (isCoordinadorRol(actorRol) && targetRol === "ADMIN") {
    return "Un coordinador no puede modificar administradores";
  }
  if (cambios.rol && !puedeAsignarRol(actorRol, cambios.rol)) {
    return "Solo un administrador puede asignar el rol de administrador";
  }
  if (
    isCoordinadorRol(actorRol) &&
    targetRol === "COORDINADOR" &&
    cambios.activo === false
  ) {
    return "Solo un administrador puede dar de baja a un coordinador";
  }
  return null;
}
