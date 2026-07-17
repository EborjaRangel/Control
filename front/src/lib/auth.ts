import * as Yup from "yup";

export const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

export const loginSchema = Yup.object({
  username: Yup.string()
    .trim()
    .matches(USERNAME_REGEX, "Usuario inválido")
    .required("El usuario es obligatorio"),
  password: Yup.string().required("La contraseña es obligatoria"),
});

export const credencialesCreateSchema = Yup.object({
  usuario: Yup.string()
    .trim()
    .test(
      "usuario",
      "Usuario: 3–32 caracteres (letras, números, . _ -)",
      (v) => !v || USERNAME_REGEX.test(v),
    ),
  password: Yup.string()
    .transform((value) => (value === "" || value == null ? undefined : value))
    .min(6, "Mínimo 6 caracteres")
    .optional(),
});

export const credencialesUpdateSchema = Yup.object({
  usuario: Yup.string()
    .trim()
    .test(
      "usuario",
      "Usuario: 3–32 caracteres (letras, números, . _ -)",
      (v) => !v || USERNAME_REGEX.test(v),
    ),
  password: Yup.string()
    .transform((value) => (value === "" || value == null ? undefined : value))
    .min(6, "Mínimo 6 caracteres")
    .optional(),
});

export type SessionUser = {
  id: string;
  username: string;
  rol: "ADMIN" | "SUPERVISOR" | "ASISTENCIA" | "CONVOCATORIA" | "DIRIGENTE" | "DETECTADO" | "RC" | "RG";
  /** Dirigente vinculado (propio o vía RC/RG). */
  dirigenteId: string | null;
  /** RC vinculado (propio o del dirigente). */
  rcId: string | null;
  /** RG vinculado (propio o del dirigente). */
  rgId: string | null;
};

export function isStaffRol(rol: SessionUser["rol"] | undefined) {
  return rol === "ADMIN" || rol === "SUPERVISOR";
}

export function isAdminRol(rol: SessionUser["rol"] | undefined) {
  return rol === "ADMIN";
}

export function isAsistenciaRol(rol: SessionUser["rol"] | undefined) {
  return rol === "ASISTENCIA";
}

export function isConvocatoriaRol(rol: SessionUser["rol"] | undefined) {
  return rol === "CONVOCATORIA";
}

export function canTakeAsistencia(rol: SessionUser["rol"] | undefined) {
  return isStaffRol(rol) || isAsistenciaRol(rol);
}

export function canManageConvocatoria(rol: SessionUser["rol"] | undefined) {
  return isStaffRol(rol) || isConvocatoriaRol(rol);
}

export function isLimitedPanelRol(rol: SessionUser["rol"] | undefined) {
  return isAsistenciaRol(rol) || isConvocatoriaRol(rol);
}
