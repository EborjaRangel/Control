export type StaffRol = "ADMIN" | "SUPERVISOR" | "ASISTENCIA" | "CONVOCATORIA";

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
  SUPERVISOR: "Supervisor",
  ASISTENCIA: "Captura de asistencia",
  CONVOCATORIA: "Convocatorias",
};
