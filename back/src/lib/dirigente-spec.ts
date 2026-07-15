/** Constantes alineadas al Excel "analisis de datos y campos para base de dirigentes". */

export const FILIACIONES_PARTIDO = [
  "PAN",
  "MORENA",
  "PRD",
  "PRI",
  "PT",
  "MC",
] as const;

export type FiliacionPartido = (typeof FILIACIONES_PARTIDO)[number];

export const STATUS_DIRIGENTE = ["ACTIVO", "INACTIVO", "BLOQUEADO", "BAJA"] as const;
export type StatusDirigente = (typeof STATUS_DIRIGENTE)[number];

export const STATUS_DIRIGENTE_LABEL: Record<StatusDirigente, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  BLOQUEADO: "Bloqueado",
  BAJA: "Baja",
};

export const PARENTESCOS_EMERGENCIA = [
  "Padre",
  "Madre",
  "Hijo(a)",
  "Cónyuge",
  "Familiar",
  "Amigo",
  "Otro",
] as const;

export const TIPOS_RED_SOCIAL = [
  "Correo electrónico",
  "Facebook",
  "Instagram",
  "X",
  "TikTok",
  "YouTube",
  "WhatsApp",
  "Otro",
] as const;
