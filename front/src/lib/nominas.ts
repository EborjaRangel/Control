import type { ConceptoSueldo, DesgloseSueldo } from "./composicion-sueldo";

export type ConceptoComposicionDTO = {
  id: string;
  concepto: ConceptoSueldo;
  monto: number;
  nombre: string | null;
  tipoDetalle: string | null;
};

export type NominaDTO = {
  id: string;
  dirigenteId: string;
  conceptosComposicion: ConceptoComposicionDTO[];
  desglose: DesgloseSueldo;
  createdAt: string;
  updatedAt: string;
  dirigente: {
    id: string;
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
    nombreCompleto: string;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    activo: boolean;
  };
};

export function totalNomina(nominas: NominaDTO[]): number {
  return nominas.reduce((sum, n) => sum + n.desglose.total, 0);
}

export function nominaToFormValues(nomina: NominaDTO) {
  return {
    conceptosComposicion: nomina.conceptosComposicion.map((c) => ({
      concepto: c.concepto,
      monto: c.monto,
      nombre: c.nombre ?? "",
      tipoDetalle: c.tipoDetalle ?? "",
    })),
  };
}
