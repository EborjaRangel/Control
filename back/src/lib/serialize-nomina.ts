import {
  calcularSueldo,
  nombreCompleto,
  type ConceptoComposicionInput,
  type DesgloseSueldo,
} from "./composicion-sueldo.js";

type ConceptoRow = {
  id: string;
  concepto: string;
  monto: unknown;
  nombre: string | null;
  tipoDetalle: string | null;
};

type NominaCore = {
  sueldoBase?: unknown;
  enProgramaSocial?: boolean;
  programaMonto?: unknown;
  conceptos: ConceptoRow[];
};

type NominaRow = NominaCore & {
  id: string;
  dirigenteId: string;
  createdAt: Date;
  updatedAt: Date;
};

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

function n(value: unknown): number {
  return value == null ? 0 : Number(value.toString());
}

function serializeConceptos(conceptos: ConceptoRow[]) {
  return conceptos.map((c) => ({
    id: c.id,
    concepto: c.concepto,
    monto: n(c.monto),
    nombre: c.nombre,
    tipoDetalle: c.tipoDetalle,
  }));
}

function toConceptoInputs(conceptos: ConceptoRow[]): ConceptoComposicionInput[] {
  return serializeConceptos(conceptos).map((c) => ({
    concepto: c.concepto as ConceptoComposicionInput["concepto"],
    monto: c.monto,
    nombre: c.nombre,
    tipoDetalle: c.tipoDetalle,
  }));
}

function desgloseFromConceptos(conceptos: ConceptoRow[]): DesgloseSueldo {
  return calcularSueldo(toConceptoInputs(conceptos));
}

export type NominaDTO = ReturnType<typeof serializeNomina>;

export function serializeNomina(
  nomina: NominaRow,
  dirigente: DirigenteResumen,
) {
  const conceptosComposicion = serializeConceptos(nomina.conceptos);
  const desglose = desgloseFromConceptos(nomina.conceptos);

  return {
    id: nomina.id,
    dirigenteId: nomina.dirigenteId,
    conceptosComposicion,
    desglose,
    createdAt: nomina.createdAt.toISOString(),
    updatedAt: nomina.updatedAt.toISOString(),
    dirigente: {
      id: dirigente.id,
      nombre: dirigente.nombre,
      primerApellido: dirigente.primerApellido,
      segundoApellido: dirigente.segundoApellido,
      nombreCompleto: nombreCompleto(dirigente),
      tipo: dirigente.tipo,
      colonia: dirigente.colonia,
      seccionElectoral: dirigente.seccionElectoral,
      activo: dirigente.activo,
    },
  };
}

export function nominaFieldsFromRow(nomina: NominaCore | null | undefined) {
  if (!nomina) {
    const vacio = calcularSueldo([]);
    return {
      conceptosComposicion: [] as ReturnType<typeof serializeConceptos>,
      desglose: vacio,
    };
  }

  const conceptosComposicion = serializeConceptos(nomina.conceptos);
  return {
    conceptosComposicion,
    desglose: desgloseFromConceptos(nomina.conceptos),
  };
}
