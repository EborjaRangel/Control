/** Mayúsculas sin acentos mientras se escribe (conserva espacios intermedios). */
export function normalizarNombrePersonaEnVivo(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase();
}

/** Mayúsculas sin acentos para persistencia (excepto correo y campos excluidos). */
export function normalizarTextoGuardado(value: string | null | undefined): string {
  if (value == null) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase();
}

export function normalizarTextoGuardadoNullable(
  value: string | null | undefined,
): string | null {
  const normalizado = normalizarTextoGuardado(value);
  return normalizado || null;
}

export function normalizarCamposNombrePersona<
  T extends { nombre: string; primerApellido: string; segundoApellido?: string | null },
>(data: T): T {
  return {
    ...data,
    nombre: normalizarTextoGuardado(data.nombre),
    primerApellido: normalizarTextoGuardado(data.primerApellido),
    segundoApellido: normalizarTextoGuardadoNullable(data.segundoApellido),
  };
}

/** Restaura el valor del catálogo al editar (coincidencia sin acentos/mayúsculas). */
export function valorCatalogoParaFormulario<T extends string>(
  guardado: string | null | undefined,
  opciones: readonly T[],
): T | string {
  if (!guardado) return guardado ?? "";
  const normalizado = normalizarTextoGuardado(guardado);
  const encontrado = opciones.find((o) => normalizarTextoGuardado(o) === normalizado);
  return encontrado ?? guardado;
}
