import {
  ESTATUS_SERVICIO_URBANO_LABEL,
  TIPO_SERVICIO_URBANO_LABEL,
} from "./serialize-servicio-urbano.js";
import type { EstatusReporteServicioUrbano, TipoServicioUrbano } from "../generated/prisma/client.js";
import { notificarUsuariosDirectos } from "./notificaciones.js";

export async function notificarEstatusServicioUrbano(input: {
  dirigenteId: string;
  folio: string;
  tipo: TipoServicioUrbano;
  direccion: string;
  estatus: EstatusReporteServicioUrbano;
  creadoPorId?: string | null;
}) {
  if (input.estatus !== "RECIBIDO" && input.estatus !== "ATENDIDO") {
    return { destinatarios: 0 };
  }

  const tipoLabel = TIPO_SERVICIO_URBANO_LABEL[input.tipo];
  const estatusLabel = ESTATUS_SERVICIO_URBANO_LABEL[input.estatus];
  const mensaje = `SERVICIO URBANO ${input.folio} (${tipoLabel}): ${estatusLabel}. UBICACIÓN: ${input.direccion}. CONSULTA EL DETALLE EN SERVICIOS URBANOS.`;

  return notificarUsuariosDirectos({
    dirigenteIds: [input.dirigenteId],
    mensaje,
    creadoPorId: input.creadoPorId,
  });
}
