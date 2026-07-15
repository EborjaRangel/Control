/** Lee JSON del cuerpo de una respuesta fetch; mensaje claro si no es JSON. */
export async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    const trimmed = text.trim();
    if (trimmed.startsWith("<") || trimmed.toLowerCase().includes("internal server error")) {
      throw new Error(
        `No se pudo conectar con el servidor (${res.status}). Verifica que el backend esté en ejecución (puerto 4000).`,
      );
    }
    throw new Error(trimmed || `Error del servidor (${res.status})`);
  }
}

export async function apiJson<T>(res: Response): Promise<T> {
  const data = await parseJsonResponse<T>(res);
  if (!res.ok) {
    const err = data as { error?: string; detalles?: string[] };
    throw new Error(err.detalles?.join(", ") ?? err.error ?? `Error ${res.status}`);
  }
  return data;
}
