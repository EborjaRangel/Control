import { nombreCompleto } from "./dirigentes.js";
import { dirigenteResumenSelect } from "./serialize-dirigente-detectados.js";

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

export { dirigenteResumenSelect };

export function serializeDirigenteRepresentantes(
  dirigente: DirigenteResumen & {
    responsableColonia: {
      id: string;
      activo: boolean;
      _count: { representantes: number };
    } | null;
  },
) {
  const rc = dirigente.responsableColonia;

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
    rcId: rc?.id ?? null,
    repCasillaActivo: rc?.activo ?? false,
    representantesRegistrados: rc?._count.representantes ?? 0,
  };
}

export type DirigenteRepresentantesDTO = ReturnType<typeof serializeDirigenteRepresentantes>;
