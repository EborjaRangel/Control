/**
 * Llamadas públicas (escaneo QR): si hay NEXT_PUBLIC_API_URL, van directo a Railway
 * y evitan el proxy serverless de Vercel en el camino crítico.
 */
export function publicApiUrl(path: string): string {
  const rel = path.replace(/^\//, "").replace(/^api\//, "");
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (base) return `${base}/api/${rel}`;
  return `/api/${rel}`;
}