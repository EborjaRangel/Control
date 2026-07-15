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
