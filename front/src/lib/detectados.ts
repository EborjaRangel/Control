import type { PersonaDetectadaFormValues } from "./validation-detectado";

export type DetectadoDTO = {
  id: string;
  dirigenteId: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  telefonoCelular: string | null;
  seccionElectoral: string;
  ineFrenteUrl: string;
  ineReversoUrl: string;
  personasRegistradas: number;
  activo: boolean;
  dirigente?: {
    id: string;
    nombreCompleto: string;
    tipo: string;
    colonia: string;
    seccionElectoral: string;
    activo: boolean;
    metaDetectados: number;
  } | null;
  personas?: PersonaDetectadaDTO[];
  createdAt: string;
  updatedAt: string;
};

export type DirigenteDetectadosDTO = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  nombreCompleto: string;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  activo: boolean;
  metaDetectados: number;
  detectadosAsignados: number;
  avancePct: number;
};

export type DirigenteDetectadosPanelDTO = {
  dirigente: DirigenteDetectadosDTO;
  detectados: DetectadoDTO[];
};

export type PersonaDetectadaDTO = {
  id: string;
  detectadoId: string;
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

export const EMPTY_DETECTADO = {
  nombre: "",
  primerApellido: "",
  segundoApellido: "",
  telefonoCelular: "",
  seccionElectoral: "",
  ineFrenteUrl: "",
  ineReversoUrl: "",
};

export const EMPTY_PERSONA_DETECTADA: PersonaDetectadaFormValues = {
  nombre: "",
  primerApellido: "",
  segundoApellido: "",
  fechaNacimiento: "",
  sexo: "",
  claveElector: "",
  curp: "",
  seccionElectoral: "",
  colonia: "",
  calle: "",
  numeroExterior: "",
  numeroInterior: "",
  codigoPostal: "",
  ineFrenteUrl: "",
  ineReversoUrl: "",
};

export function detectadoToFormValues(d: DetectadoDTO) {
  return {
    nombre: d.nombre,
    primerApellido: d.primerApellido,
    segundoApellido: d.segundoApellido ?? "",
    telefonoCelular: d.telefonoCelular ?? "",
    seccionElectoral: d.seccionElectoral,
    ineFrenteUrl: d.ineFrenteUrl,
    ineReversoUrl: d.ineReversoUrl,
  };
}

export function personaToFormValues(p: PersonaDetectadaDTO): PersonaDetectadaFormValues {
  const sexo = p.sexo === "H" || p.sexo === "M" ? p.sexo : "";
  return {
    nombre: p.nombre,
    primerApellido: p.primerApellido,
    segundoApellido: p.segundoApellido ?? "",
    fechaNacimiento: p.fechaNacimiento,
    sexo,
    claveElector: p.claveElector ?? "",
    curp: p.curp ?? "",
    seccionElectoral: p.seccionElectoral,
    colonia: p.colonia,
    calle: p.calle,
    numeroExterior: p.numeroExterior,
    numeroInterior: p.numeroInterior ?? "",
    codigoPostal: p.codigoPostal,
    ineFrenteUrl: p.ineFrenteUrl,
    ineReversoUrl: p.ineReversoUrl,
  };
}
