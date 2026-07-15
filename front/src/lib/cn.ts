/** Combina clases condicionales (patrón Tailwind). */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
