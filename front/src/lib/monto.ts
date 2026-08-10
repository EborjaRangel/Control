/** Limpia el texto del monto mientras se escribe (máx. 2 decimales). */
export function formatearMontoEnVivo(raw: string): string {
  let s = raw.replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = `${s.slice(0, firstDot + 1)}${s.slice(firstDot + 1).replace(/\./g, "")}`;
  }

  const dot = s.indexOf(".");
  let intPart = dot === -1 ? s : s.slice(0, dot);
  let decPart = dot === -1 ? undefined : s.slice(dot + 1, dot + 3);

  if (intPart.length > 1) {
    intPart = intPart.replace(/^0+/, "") || "0";
  }

  if (decPart !== undefined) return `${intPart}.${decPart}`;
  return intPart;
}

/** Quita ceros a la derecha del decimal y el punto final (ej. 100.50 → 100.5, 100.00 → 100). */
export function quitarCerosDerechaMonto(raw: string): string {
  const s = formatearMontoEnVivo(raw.trim());
  if (!s || s === ".") return "";
  if (!s.includes(".")) return s.replace(/^0+(?=\d)/, "") || "0";

  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return String(n);
}

export function montoANumero(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === "" || value == null) return 0;
  const n = Number(quitarCerosDerechaMonto(String(value)));
  return Number.isNaN(n) ? 0 : n;
}
