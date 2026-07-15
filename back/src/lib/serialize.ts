import { calcularSueldo, type DesgloseSueldo } from "./dirigentes";
import { urlQrAsistencia, payloadQrDirigente } from "./codigo-qr.js";
import { nominaFieldsFromRow } from "./serialize-nomina.js";

type ConceptoRow = {
  id: string;
  concepto: string;
  monto: unknown;
  nombre: string | null;
  tipoDetalle: string | null;
};

type NominaRow = {
  sueldoBase?: unknown;
  enProgramaSocial?: boolean;
  programaMonto?: unknown;
  conceptos: ConceptoRow[];
};

type EstudioRow = {
  id: string;
  descripcion: string;
  institucion: string | null;
  anioEgreso: number | null;
  cedula: string | null;
  certificado: boolean;
  otros: string | null;
};

type RedSocialRow = {
  id: string;
  descripcion: string;
  cuenta: string;
};

type ContactoRow = {
  id: string;
  nombre: string;
  parentesco: string;
  telefono: string;
};

type IngresoRow = {
  id: string;
  tipoIngreso: string;
  monto: unknown;
};

type ReferenteRow = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
};

type DirigenteRow = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: Date;
  telefonoCelular: string;
  correo: string;
  fotoUrl: string | null;
  alias: string | null;
  curp: string | null;
  tieneIne: boolean;
  ineFrenteUrl: string | null;
  ineReversoUrl: string | null;
  tipo: string;
  seccionElectoral: string;
  distritoFederal: number | null;
  distritoLocal: number | null;
  colonia: string;
  calle: string;
  numeroExterior: string;
  numeroInterior: string | null;
  codigoPostal: string;
  alcaldia: string;
  estadoRepublica: string;
  filiacion: string | null;
  aspiracionCortoPlazo: string | null;
  aspiracionLargoPlazo: string | null;
  referenteId: string | null;
  antecedentesPoliticos: string | null;
  notasCoordinacion: string | null;
  status: string;
  activo: boolean;
  codigoQr: string;
  createdAt: Date;
  updatedAt: Date;
  nomina?: NominaRow | null;
  usuario?: { username: string; passwordPlano: string | null } | null;
  unidadTerritorial?: {
    id: string;
    clave: string;
    nombre: string;
    tipoUt: string | null;
  } | null;
  referente?: ReferenteRow | null;
  estudios?: EstudioRow[];
  redesSociales?: RedSocialRow[];
  contactosEmergencia?: ContactoRow[];
  ingresos?: IngresoRow[];
};

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export type DirigenteDTO = ReturnType<typeof serializeDirigente>;

export function serializeDirigente(
  d: DirigenteRow,
  options?: { revealPassword?: boolean },
) {
  const nomina = nominaFieldsFromRow(d.nomina ?? null);

  return {
    id: d.id,
    nombre: d.nombre,
    primerApellido: d.primerApellido,
    segundoApellido: d.segundoApellido,
    fechaNacimiento: d.fechaNacimiento.toISOString().slice(0, 10),
    telefonoCelular: d.telefonoCelular,
    correo: d.correo,
    fotoUrl: d.fotoUrl,
    alias: d.alias,
    curp: d.curp,
    tieneIne: d.tieneIne,
    ineFrenteUrl: d.ineFrenteUrl,
    ineReversoUrl: d.ineReversoUrl,
    tipo: d.tipo,
    seccionElectoral: d.seccionElectoral,
    distritoFederal: d.distritoFederal,
    distritoLocal: d.distritoLocal,
    colonia: d.colonia,
    calle: d.calle,
    numeroExterior: d.numeroExterior,
    numeroInterior: d.numeroInterior,
    codigoPostal: d.codigoPostal,
    alcaldia: d.alcaldia,
    estadoRepublica: d.estadoRepublica,
    filiacion: d.filiacion,
    aspiracionCortoPlazo: d.aspiracionCortoPlazo,
    aspiracionLargoPlazo: d.aspiracionLargoPlazo,
    referenteId: d.referenteId,
    referente: d.referente
      ? {
          id: d.referente.id,
          nombre: d.referente.nombre,
          primerApellido: d.referente.primerApellido,
          segundoApellido: d.referente.segundoApellido,
        }
      : null,
    antecedentesPoliticos: d.antecedentesPoliticos,
    notasCoordinacion: d.notasCoordinacion,
    status: d.status,
    unidadTerritorial: d.unidadTerritorial
      ? {
          id: d.unidadTerritorial.id,
          clave: d.unidadTerritorial.clave,
          nombre: d.unidadTerritorial.nombre,
          tipoUt: d.unidadTerritorial.tipoUt,
        }
      : null,
    estudios: (d.estudios ?? []).map((e) => ({
      id: e.id,
      descripcion: e.descripcion,
      institucion: e.institucion,
      anioEgreso: e.anioEgreso,
      cedula: e.cedula,
      certificado: e.certificado,
      otros: e.otros,
    })),
    redesSociales: (d.redesSociales ?? []).map((r) => ({
      id: r.id,
      descripcion: r.descripcion,
      cuenta: r.cuenta,
    })),
    contactosEmergencia: (d.contactosEmergencia ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      parentesco: c.parentesco,
      telefono: c.telefono,
    })),
    ingresos: (d.ingresos ?? []).map((i) => ({
      id: i.id,
      tipoIngreso: i.tipoIngreso,
      monto: num(i.monto),
    })),
    conceptosComposicion: nomina.conceptosComposicion,
    activo: d.activo,
    codigoQr: d.codigoQr,
    qrUrl: urlQrAsistencia(d.codigoQr),
    qrPayload: payloadQrDirigente({
      codigoQr: d.codigoQr,
      nombre: d.nombre,
      primerApellido: d.primerApellido,
      segundoApellido: d.segundoApellido,
      fechaNacimiento: d.fechaNacimiento,
    }),
    usuario: d.usuario?.username ?? null,
    password: options?.revealPassword ? d.usuario?.passwordPlano ?? null : null,
    desglose: nomina.desglose as DesgloseSueldo,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}
