import * as Yup from "yup";
import { USERNAME_REGEX } from "./auth-validation.js";
import { PANEL_USER_ROLES } from "./usuarios-permisos.js";

export const staffUserCreateSchema = Yup.object({
  username: Yup.string()
    .trim()
    .matches(USERNAME_REGEX, "Usuario: 3–32 caracteres (letras, números, . _ -)")
    .required("El usuario es obligatorio"),
  password: Yup.string()
    .when("rol", {
      is: "PASE_LISTA",
      then: (schema) => schema.min(3, "Mínimo 3 caracteres").required("La contraseña es el código del pase de lista"),
      otherwise: (schema) => schema.min(6, "Mínimo 6 caracteres").required("La contraseña es obligatoria"),
    }),
  rol: Yup.string()
    .oneOf([...PANEL_USER_ROLES], "Rol inválido")
    .required("El rol es obligatorio"),
});

export const staffUserUpdateSchema = Yup.object({
  username: Yup.string()
    .trim()
    .matches(USERNAME_REGEX, "Usuario: 3–32 caracteres (letras, números, . _ -)")
    .optional(),
  password: Yup.string()
    .transform((value) => (value === "" || value == null ? undefined : value))
    .when("rol", {
      is: "PASE_LISTA",
      then: (schema) => schema.min(3, "Mínimo 3 caracteres").optional(),
      otherwise: (schema) => schema.min(6, "Mínimo 6 caracteres").optional(),
    }),
  rol: Yup.string().oneOf([...PANEL_USER_ROLES], "Rol inválido").optional(),
  activo: Yup.boolean().optional(),
});
