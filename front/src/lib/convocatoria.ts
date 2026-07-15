export type ConvocatoriaEstado = {
  listo: boolean;
  faltantes: string[];
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  notificaciones: boolean;
};

export type ResumenCanalConvocatoria = {
  enviados: number;
  fallidos: number;
  omitidos: number;
};

export type ResumenConvocatoriaEvento = {
  eventoId: string;
  totalDirigentes: number;
  email: ResumenCanalConvocatoria;
  sms: ResumenCanalConvocatoria;
  whatsapp: ResumenCanalConvocatoria;
};

export type EnvioConvocatoriaItem = {
  id: string;
  canal: "EMAIL" | "SMS" | "WHATSAPP";
  destino: string;
  estado: "ENVIADO" | "FALLIDO" | "OMITIDO";
  error: string | null;
  enviadoAt: string;
  dirigente: { id: string; nombreCompleto: string };
};

export type ResumenEnviosEvento = {
  total: number;
  porCanal: { canal: string; estado: string; count: number }[];
  ultimos: EnvioConvocatoriaItem[];
};

export const CANAL_CONVOCATORIA_LABEL: Record<string, string> = {
  EMAIL: "Correo electrónico",
  SMS: "Mensaje de texto (SMS)",
  WHATSAPP: "WhatsApp",
};

export const ESTADO_ENVIO_LABEL: Record<string, string> = {
  ENVIADO: "Enviado",
  FALLIDO: "Fallido",
  OMITIDO: "Omitido",
};
