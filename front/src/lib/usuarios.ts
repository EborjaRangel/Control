export type StaffRol = "ADMIN" | "SUPERVISOR";

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
};
