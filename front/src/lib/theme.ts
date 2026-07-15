/**
 * Tokens de diseño para JS (Mapbox, QR, etc.).
 * Mantener sincronizados con :root y @theme en globals.css.
 */
export const theme = {
  pin: "#0055a4",
  pinHover: "#004482",
  pinDark: "#003366",
  pinLight: "#e8f0fa",
  pinMuted: "#d0e3f2",
  surface: "#ffffff",
  surfaceSoft: "#f5f5f5",
  surfaceMuted: "#efefef",
  surfaceHover: "#e9e9e9",
  ink: "#111111",
  inkSecondary: "#767676",
  inkMuted: "#555555",
  line: "#e1e1e1",
  lineStrong: "#cdcdcd",
  coyoteBlue: "#1565C0",
  map: {
    alcaldiaFill: "#efefef",
    alcaldiaLine: "#767676",
    seccionFill: "#bdbdbd",
    seccionLine: "#9e9e9e",
    seccionFillOpacity: 0.12,
    seccionLineOpacity: 0.5,
    alcaldiaFillOpacity: 0.2,
  },
} as const;

export const COYOTE_BLUE = theme.coyoteBlue;
