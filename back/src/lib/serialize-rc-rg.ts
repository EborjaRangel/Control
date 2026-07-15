import { nombreCompleto } from "./dirigentes.js";

type RepresentanteRow = {
  id: string;
  responsableColoniaId: string | null;
  responsableGeneralId: string | null;
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

type DirigenteResumenRow = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  distritoLocal: number | null;
  unidadTerritorial: {
    id: string;
    clave: string;
    nombre: string;
    tipoUt: string | null;
  } | null;
};

type OperadorRow = {
  id: string;
  dirigenteId?: string | null;
  dirigente?: DirigenteResumenRow | null;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  telefonoCelular: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  usuario?: { username: string; passwordPlano: string | null } | null;
  _count?: { representantes: number };
  representantes?: RepresentanteRow[];
};

function serializeDirigenteResumen(d: DirigenteResumenRow | null | undefined) {
  if (!d) return null;
  return {
    id: d.id,
    nombreCompleto: nombreCompleto(d),
    tipo: d.tipo,
    colonia: d.colonia,
    seccionElectoral: d.seccionElectoral,
    distritoLocal: d.distritoLocal,
    unidadTerritorial: d.unidadTerritorial,
  };
}

type RcRow = OperadorRow & { colonia: string };
type RgRow = OperadorRow;

export function serializeRepresentante(r: RepresentanteRow) {
  return {
    id: r.id,
    responsableColoniaId: r.responsableColoniaId,
    responsableGeneralId: r.responsableGeneralId,
    nombre: r.nombre,
    primerApellido: r.primerApellido,
    segundoApellido: r.segundoApellido,
    nombreCompleto: nombreCompleto(r),
    fechaNacimiento: r.fechaNacimiento.toISOString().slice(0, 10),
    sexo: r.sexo,
    claveElector: r.claveElector,
    curp: r.curp,
    seccionElectoral: r.seccionElectoral,
    colonia: r.colonia,
    calle: r.calle,
    numeroExterior: r.numeroExterior,
    numeroInterior: r.numeroInterior,
    codigoPostal: r.codigoPostal,
    ineFrenteUrl: r.ineFrenteUrl,
    ineReversoUrl: r.ineReversoUrl,
    activo: r.activo,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export type RepresentanteCasillaDTO = ReturnType<typeof serializeRepresentante>;
export type RcDTO = ReturnType<typeof serializeRc>;
export type RgDTO = ReturnType<typeof serializeRg>;

function serializeOperadorBase(
  d: OperadorRow,
  extra: Record<string, unknown>,
  options?: { revealPassword?: boolean },
) {
  const registrados = d._count?.representantes ?? d.representantes?.filter((r) => r.activo).length ?? 0;
  return {
    id: d.id,
    dirigenteId: d.dirigenteId ?? d.dirigente?.id ?? null,
    dirigente: serializeDirigenteResumen(d.dirigente),
    nombre: d.nombre,
    primerApellido: d.primerApellido,
    segundoApellido: d.segundoApellido,
    nombreCompleto: nombreCompleto(d),
    telefonoCelular: d.telefonoCelular,
    representantesRegistrados: registrados,
    activo: d.activo,
    usuario: d.usuario?.username ?? null,
    password: options?.revealPassword ? d.usuario?.passwordPlano ?? null : null,
    representantes: d.representantes?.map(serializeRepresentante),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    ...extra,
  };
}

export function serializeRc(d: RcRow, options?: { revealPassword?: boolean }) {
  return serializeOperadorBase(d, { colonia: d.colonia }, options);
}

export function serializeRg(d: RgRow, options?: { revealPassword?: boolean }) {
  return serializeOperadorBase(d, {}, options);
}

export function representanteCreateData(data: {
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
  fechaNacimiento: string;
  sexo?: string | null;
  claveElector?: string | null;
  curp?: string | null;
  seccionElectoral: string;
  colonia: string;
  calle: string;
  numeroExterior: string;
  numeroInterior?: string | null;
  codigoPostal: string;
  ineFrenteUrl: string;
  ineReversoUrl: string;
}) {
  return {
    nombre: data.nombre,
    primerApellido: data.primerApellido,
    segundoApellido: data.segundoApellido || null,
    fechaNacimiento: new Date(data.fechaNacimiento),
    sexo: data.sexo || null,
    claveElector: data.claveElector || null,
    curp: data.curp || null,
    seccionElectoral: data.seccionElectoral,
    colonia: data.colonia,
    calle: data.calle,
    numeroExterior: data.numeroExterior,
    numeroInterior: data.numeroInterior || null,
    codigoPostal: data.codigoPostal,
    ineFrenteUrl: data.ineFrenteUrl,
    ineReversoUrl: data.ineReversoUrl,
  };
}
