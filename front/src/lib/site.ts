export const APP_TITLE = "AXIS";
export const APP_TITLE_SHORT = "AXIS";
export const NAVBAR_TITLE = "AXIS";
export const APP_DESCRIPTION =
  "AXIS — sistema de control y administración de dirigentes en la alcaldía Coyoacán";
export const BRAND_SIGNATURE = "AXIS";

export function appMetadataBase(): URL {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (explicit) return new URL(explicit);
  const vercelHost = (
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    ""
  )
    .trim()
    .replace(/^https?:\/\//, "");
  if (vercelHost) return new URL(`https://${vercelHost}`);
  return new URL("http://localhost:3000");
}
