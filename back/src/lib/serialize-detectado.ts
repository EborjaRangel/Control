import { nombreCompleto } from "./dirigentes.js";

type PersonaRow = {
  id: string;
  detectadoId: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: Date;
  sexo: string | null;
  claveElector: string | null;
  curp: string | null;
  seccionElectoral: string;
  colonia: string;
  calle: string;
  numeroExterior: string;
  numeroInterior: string | null;
  codigoPostal: string;
  ineFrenteUrl: string;
  ineReversoUrl: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type DetectadoRow = {
  id: string;
  dirigenteId: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  telefonoCelular: string | null;
  seccionElectoral: string;
  ineFrenteUrl: string;
  ineReversoUrl: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  dirigente?: {
    id: string;
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    activo: boolean;
    metaDetectados: number;
  } | null;
  personas?: PersonaRow[];
  _count?: { personas: number };
};

function serializePersona(p: PersonaRow) {
  return {
    id: p.id,
    detectadoId: p.detectadoId,
    nombre: p.nombre,
    primerApellido: p.primerApellido,
    segundoApellido: p.segundoApellido,
    nombreCompleto: nombreCompleto(p),
    fechaNacimiento: p.fechaNacimiento.toISOString().slice(0, 10),
    sexo: p.sexo,
    claveElector: p.claveElector,
    curp: p.curp,
    seccionElectoral: p.seccionElectoral,
    colonia: p.colonia,
    calle: p.calle,
    numeroExterior: p.numeroExterior,
    numeroInterior: p.numeroInterior,
    codigoPostal: p.codigoPostal,
    ineFrenteUrl: p.ineFrenteUrl,
    ineReversoUrl: p.ineReversoUrl,
    activo: p.activo,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export type PersonaDetectadaDTO = ReturnType<typeof serializePersona>;
export type DetectadoDTO = ReturnType<typeof serializeDetectado>;

export function serializeDetectado(
  d: DetectadoRow,
  options?: { personasActivas?: number },
) {
  const personasRegistradas =
    options?.personasActivas ??
    d._count?.personas ??
    (d.personas ? d.personas.filter((p) => p.activo).length : 0);

  return {
    id: d.id,
    dirigenteId: d.dirigenteId,
    nombre: d.nombre,
    primerApellido: d.primerApellido,
    segundoApellido: d.segundoApellido,
    nombreCompleto: nombreCompleto(d),
    telefonoCelular: d.telefonoCelular,
    seccionElectoral: d.seccionElectoral,
    ineFrenteUrl: d.ineFrenteUrl,
    ineReversoUrl: d.ineReversoUrl,
    personasRegistradas,
    activo: d.activo,
    dirigente: d.dirigente
      ? {
          id: d.dirigente.id,
          nombreCompleto: nombreCompleto(d.dirigente),
          tipo: d.dirigente.tipo,
          colonia: d.dirigente.colonia,
          seccionElectoral: d.dirigente.seccionElectoral,
          activo: d.dirigente.activo,
          metaDetectados: d.dirigente.metaDetectados,
        }
      : null,
    personas: d.personas?.map(serializePersona),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export { serializePersona };
