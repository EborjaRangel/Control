export type StaffRol = "ADMIN" | "COORDINADOR" | "SUPERVISOR" | "ASISTENCIA" | "CONVOCATORIA" | "PASE_LISTA";

export type StaffUserDTO = {
  id: string;
  username: string;
  rol: StaffRol;
  activo: boolean;
  password: string | null;
  createdAt: string;
  updatedAt: string;
};

export const STAFF_ROL_LABEL: Record<StaffRol, string> = {
  ADMIN: "Administrador",
  COORDINADOR: "Coordinador",
  SUPERVISOR: "Supervisor",
  ASISTENCIA: "Captura de asistencia",
  CONVOCATORIA: "Convocatorias",
  PASE_LISTA: "Pase de lista",
};

export function puedeEditarUsuarioStaff(
  actorRol: StaffRol | undefined,
  targetRol: StaffRol,
): boolean {
  if (actorRol === "COORDINADOR" && targetRol === "ADMIN") return false;
  return true;
}

export function puedeAsignarRolStaff(
  actorRol: StaffRol | undefined,
  rolNuevo: StaffRol,
): boolean {
  if (rolNuevo === "ADMIN" && actorRol !== "ADMIN") return false;
  return true;
}

export function puedeDarDeBajaUsuarioStaff(actorRol: StaffRol | undefined): boolean {
  return actorRol === "ADMIN";
}
