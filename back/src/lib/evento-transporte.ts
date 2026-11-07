import type { EventoAsistencia } from "../generated/prisma/client.js";

/** Solo eventos de asistencia abiertos aceptan capturas de transporte. */
export function eventoAceptaRegistroTransporte(evento: Pick<EventoAsistencia, "estado">): boolean {
  return evento.estado === "ABIERTO";
}
