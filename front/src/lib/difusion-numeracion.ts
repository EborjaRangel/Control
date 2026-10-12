import type { RegistroDifusionDTO } from "@/lib/difusion";

/** Número 1…N por cada par (campaña, dirigente), orden por fecha de registro ascendente. */
export function numerosAccionPorRegistro(
  registros: RegistroDifusionDTO[],
): Map<string, number> {
  const grupos = new Map<string, RegistroDifusionDTO[]>();

  for (const r of registros) {
    const key = `${r.campanaId}\0${r.dirigenteId}`;
    const lista = grupos.get(key);
    if (lista) lista.push(r);
    else grupos.set(key, [r]);
  }

  const numeros = new Map<string, number>();
  for (const lista of grupos.values()) {
    const ordenadas = [...lista].sort(
      (a, b) =>
        new Date(a.registradoAt).getTime() - new Date(b.registradoAt).getTime() ||
        a.id.localeCompare(b.id),
    );
    ordenadas.forEach((r, i) => numeros.set(r.id, i + 1));
  }

  return numeros;
}

export function numeroAccionLabel(
  registroId: string,
  numeros: Map<string, number>,
): string | null {
  const n = numeros.get(registroId);
  return n != null ? String(n) : null;
}
