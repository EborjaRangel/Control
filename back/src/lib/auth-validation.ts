import * as Yup from "yup";

/** Inicio de sesión: acepta cuentas anteriores (desde 3 caracteres). */
export const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;

/** Alta de usuarios: solo alfanumérico, mínimo 4. */
export const CREDENTIAL_ALPHANUMERIC_REGEX = /^[a-zA-Z0-9]{4,32}$/;
export const CREDENTIAL_ALPHANUMERIC_MSG = "Mínimo 4 caracteres alfanuméricos";

const yupPasswordAlfanumericaOpcional = () =>
  Yup.string()
    .transform((value) => (value === "" || value == null ? undefined : value))
    .test(
      "password-alfanumerica",
      CREDENTIAL_ALPHANUMERIC_MSG,
      (v) => v == null || CREDENTIAL_ALPHANUMERIC_REGEX.test(v),
    );

const yupUsuarioNuevoOpcional = () =>
  Yup.string()
    .trim()
    .test(
      "usuario",
      "Usuario: 4–32 caracteres alfanuméricos",
      (v) => !v || CREDENTIAL_ALPHANUMERIC_REGEX.test(v),
    );

export const loginSchema = Yup.object({
  username: Yup.string()
    .trim()
    .matches(USERNAME_REGEX, "Usuario inválido")
    .required("El usuario es obligatorio"),
  password: Yup.string().required("La contraseña es obligatoria"),
});

export const recuperarContrasenaSchema = Yup.object({
  correo: Yup.string()
    .trim()
    .email("Correo electrónico inválido")
    .required("El correo electrónico es obligatorio"),
});

export const restablecerContrasenaSchema = Yup.object({
  token: Yup.string().trim().required("El enlace no es válido"),
  password: Yup.string()
    .min(6, "Mínimo 6 caracteres")
    .required("La contraseña es obligatoria"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Las contraseñas no coinciden")
    .required("Confirma la contraseña"),
});

export const credencialesCreateSchema = Yup.object({
  usuario: yupUsuarioNuevoOpcional(),
  password: yupPasswordAlfanumericaOpcional(),
});

export const credencialesUpdateSchema = Yup.object({
  usuario: yupUsuarioNuevoOpcional(),
  password: yupPasswordAlfanumericaOpcional(),
});
