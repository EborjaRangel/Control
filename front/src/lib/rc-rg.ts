import type { RepresentanteCasillaFormValues } from "./validation-rc-rg";
import { nombreColoniaCatalogo } from "./colonias";

export type DirigenteRepresentantesDTO = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  activo: boolean;
  rcId: string | null;
  repCasillaActivo: boolean;
  representantesRegistrados: number;
};

export type RepresentanteCasillaDTO = {
  id: string;
  responsableColoniaId: string | null;
  responsableGeneralId: string | null;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  fechaNacimiento: string;
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
  createdAt: string;
  updatedAt: string;
};

export type DirigenteOperadorResumen = {
  id: string;
  nombreCompleto: string;
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

export type RcDTO = {
  id: string;
  dirigenteId: string | null;
  dirigente: DirigenteOperadorResumen | null;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  telefonoCelular: string | null;
  colonia: string;
  representantesRegistrados: number;
  activo: boolean;
  usuario: string | null;
  password: string | null;
  representantes?: RepresentanteCasillaDTO[];
  createdAt: string;
  updatedAt: string;
};

export type RgDTO = {
  id: string;
  dirigenteId: string | null;
  dirigente: DirigenteOperadorResumen | null;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  telefonoCelular: string | null;
  representantesRegistrados: number;
  activo: boolean;
  usuario: string | null;
  password: string | null;
  representantes?: RepresentanteCasillaDTO[];
  createdAt: string;
  updatedAt: string;
};

export const EMPTY_RC = {
  nombre: "",
  primerApellido: "",
  segundoApellido: "",
  telefonoCelular: "",
  colonia: "",
  usuario: "",
  password: "",
};

export const EMPTY_RG = {
  nombre: "",
  primerApellido: "",
  segundoApellido: "",
  telefonoCelular: "",
  usuario: "",
  password: "",
};

export const EMPTY_REPRESENTANTE: RepresentanteCasillaFormValues = {
  nombre: "",
  primerApellido: "",
  segundoApellido: "",
  fechaNacimiento: "",
  sexo: "",
  claveElector: "",
  curp: "",
  seccionElectoral: "",
  coloniaSeccion: "",
  colonia: "",
  calle: "",
  numeroExterior: "",
  numeroInterior: "",
  codigoPostal: "",
  ineFrenteUrl: "",
  ineReversoUrl: "",
};

export function rcToFormValues(r: RcDTO) {
  return {
    nombre: r.nombre,
    primerApellido: r.primerApellido,
    segundoApellido: r.segundoApellido ?? "",
    telefonoCelular: r.telefonoCelular ?? "",
    colonia: r.colonia,
    usuario: r.usuario ?? "",
    password: "",
  };
}

export function rgToFormValues(r: RgDTO) {
  return {
    nombre: r.nombre,
    primerApellido: r.primerApellido,
    segundoApellido: r.segundoApellido ?? "",
    telefonoCelular: r.telefonoCelular ?? "",
    usuario: r.usuario ?? "",
    password: "",
  };
}

export function representanteToFormValues(r: RepresentanteCasillaDTO): RepresentanteCasillaFormValues {
  const sexo = r.sexo === "H" || r.sexo === "M" ? r.sexo : "";
  return {
    nombre: r.nombre,
    primerApellido: r.primerApellido,
    segundoApellido: r.segundoApellido ?? "",
    fechaNacimiento: r.fechaNacimiento,
    sexo,
    claveElector: r.claveElector ?? "",
    curp: r.curp ?? "",
    seccionElectoral: r.seccionElectoral,
    coloniaSeccion: nombreColoniaCatalogo(r.colonia),
    colonia: r.colonia,
    calle: r.calle,
    numeroExterior: r.numeroExterior,
    numeroInterior: r.numeroInterior ?? "",
    codigoPostal: r.codigoPostal,
    ineFrenteUrl: r.ineFrenteUrl,
    ineReversoUrl: r.ineReversoUrl,
  };
}
