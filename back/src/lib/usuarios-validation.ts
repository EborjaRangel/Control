import * as Yup from "yup";
import {
  CREDENTIAL_ALPHANUMERIC_MSG,
  CREDENTIAL_ALPHANUMERIC_REGEX,
  USERNAME_REGEX,
} from "./auth-validation.js";
import { PANEL_USER_ROLES, ROLES_ASIGNABLES_NUEVOS } from "./usuarios-permisos.js";

export const staffUserCreateSchema = Yup.object({
  username: Yup.string()
    .trim()
    .matches(CREDENTIAL_ALPHANUMERIC_REGEX, "Usuario: 4–32 caracteres alfanuméricos")
    .required("El usuario es obligatorio"),
  password: Yup.string()
    .trim()
    .when("rol", {
      is: "PASE_LISTA",
      then: (schema) =>
        schema
          .matches(CREDENTIAL_ALPHANUMERIC_REGEX, CREDENTIAL_ALPHANUMERIC_MSG)
          .required("La contraseña es el código del pase de lista"),
      otherwise: (schema) =>
        schema.matches(CREDENTIAL_ALPHANUMERIC_REGEX, CREDENTIAL_ALPHANUMERIC_MSG).required(
          "La contraseña es obligatoria",
        ),
    }),
  rol: Yup.string()
    .oneOf([...ROLES_ASIGNABLES_NUEVOS], "Rol inválido")
    .required("El rol es obligatorio"),
});

export const staffUserUpdateSchema = Yup.object({
  username: Yup.string()
    .trim()
    .test(
      "username",
      "Usuario: 4–32 caracteres alfanuméricos",
      (v) => !v || CREDENTIAL_ALPHANUMERIC_REGEX.test(v) || USERNAME_REGEX.test(v),
    )
    .optional(),
  password: Yup.string()
    .transform((value) => (value === "" || value == null ? undefined : value))
    .test(
      "password-alfanumerica",
      CREDENTIAL_ALPHANUMERIC_MSG,
      (v) => v == null || CREDENTIAL_ALPHANUMERIC_REGEX.test(v),
    ),
  rol: Yup.string().oneOf([...PANEL_USER_ROLES], "Rol inválido").optional(),
  activo: Yup.boolean().optional(),
});
