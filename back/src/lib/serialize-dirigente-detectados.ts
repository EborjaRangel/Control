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
  metaDetectados: number;
};

const dirigenteResumenSelect = {
  id: true,
  nombre: true,
  primerApellido: true,
  segundoApellido: true,
  tipo: true,
  colonia: true,
  seccionElectoral: true,
  activo: true,
  metaDetectados: true,
} as const;

export { dirigenteResumenSelect };

export function serializeDirigenteDetectados(
  dirigente: DirigenteResumen,
  detectadosActivos: number,
) {
  const avancePct =
    dirigente.metaDetectados > 0
      ? Math.min(100, Math.round((detectadosActivos / dirigente.metaDetectados) * 100))
      : detectadosActivos > 0
        ? 100
        : 0;

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
    metaDetectados: dirigente.metaDetectados,
    detectadosAsignados: detectadosActivos,
    avancePct,
  };
}

export type DirigenteDetectadosDTO = ReturnType<typeof serializeDirigenteDetectados>;
