const RAW_TOKEN = (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "").trim();

export const CENTRO_COYOACAN = { lat: 19.346, lng: -99.162 };

/** Token público de Mapbox; vacío si falta o es un placeholder inválido. */
export const MAPBOX_TOKEN =
  RAW_TOKEN.startsWith("pk.") && !RAW_TOKEN.includes("SENSITIVE") ? RAW_TOKEN : "";

export const MAPBOX_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE ?? "mapbox://styles/mapbox/light-v11";

export function mapboxConfigError(): string | null {
  if (!RAW_TOKEN) {
    return "Configura NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN en front/.env.local (token pk.… de Mapbox).";
  }
  if (!RAW_TOKEN.startsWith("pk.") || RAW_TOKEN.includes("SENSITIVE")) {
    return "El token de Mapbox en front/.env.local es inválido. Debe empezar con pk. y no ser un placeholder.";
  }
  return null;
}
