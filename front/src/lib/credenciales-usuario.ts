export const PASSWORD_DEFECTO_USUARIO = "123456";

/** Primera letra del nombre + apellido paterno completo, en minúsculas sin acentos. */
export function usuarioDesdeNombreApellido(
  nombre: string,
  primerApellido: string,
): string {
  const nombreNorm = nombre
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const apellidoNorm = primerApellido
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "");

  const inicial = nombreNorm.charAt(0);
  if (!inicial || !apellidoNorm) return "";
  return `${inicial}${apellidoNorm}`;
}

export function credencialesPorDefecto(nombre: string, primerApellido: string) {
  return {
    usuario: usuarioDesdeNombreApellido(nombre, primerApellido),
    password: PASSWORD_DEFECTO_USUARIO,
  };
}
