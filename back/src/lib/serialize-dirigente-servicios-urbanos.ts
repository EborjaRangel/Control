import { nombreCompleto } from "./dirigentes.js";

type DirigenteResumen = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  activo: boolean;
};

export const dirigenteResumenServiciosUrbanosSelect = {
  id: true,
  nombre: true,
  primerApellido: true,
  segundoApellido: true,
  tipo: true,
  colonia: true,
  seccionElectoral: true,
  activo: true,
} as const;

export function serializeDirigenteServiciosUrbanos(
  dirigente: DirigenteResumen,
  reportesActivos: number,
) {
  return {
    id: dirigente.id,
    nombre: dirigente.nombre,
    primerApellido: dirigente.primerApellido,
    segundoApellido: dirigente.segundoApellido,
    nombreCompleto: nombreCompleto(dirigente),
    tipo: dirigente.tipo,
    colonia: dirigente.colonia,
    seccionElectoral: dirigente.seccionElectoral,
    activo: dirigente.activo,
    reportesActivos,
  };
}

export type DirigenteServiciosUrbanosDTO = ReturnType<typeof serializeDirigenteServiciosUrbanos>;
