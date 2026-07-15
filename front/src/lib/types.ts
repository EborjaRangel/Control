import type { DirigenteFormValues } from "@/lib/validation";
import type { StatusDirigente } from "@/lib/dirigente-spec";
import type { ConceptoSueldo, DesgloseSueldo } from "@/lib/composicion-sueldo";
import { NOMBRES_COLONIAS_COYOACAN } from "@/lib/colonias";
import { SECCIONES_ELECTORALES_COYOACAN } from "@/lib/secciones-electorales";
import {
  FILIACIONES_PARTIDO,
  PARENTESCOS_EMERGENCIA,
  TIPOS_RED_SOCIAL,
} from "@/lib/dirigente-spec";
import { valorCatalogoParaFormulario } from "@/lib/normalizar-texto";
import {
  usuarioDesdeNombreApellido,
} from "@/lib/credenciales-usuario";

export type ConceptoComposicionDTO = {
  id: string;
  concepto: ConceptoSueldo;
  monto: number;
  nombre: string | null;
  tipoDetalle: string | null;
};

export const EMPTY_DIRIGENTE: DirigenteFormValues = {
  nombre: "",
  primerApellido: "",
  segundoApellido: "",
  fechaNacimiento: "",
  telefonoCelular: "",
  correo: "",
  fotoUrl: null,
  alias: "",
  curp: "",
  tieneIne: false,
  ineFrenteUrl: "",
  ineReversoUrl: "",
  tipo: "D4",
  seccionElectoral: "",
  distritoFederal: undefined,
  distritoLocal: undefined,
  colonia: "",
  calle: "",
  numeroExterior: "",
  numeroInterior: "",
  codigoPostal: "",
  alcaldia: "Coyoacán",
  estadoRepublica: "Ciudad de México",
  unidadTerritorialId: null,
  filiacion: null,
  aspiracionCortoPlazo: "",
  aspiracionLargoPlazo: "",
  referenteId: "",
  antecedentesPoliticos: "",
  notasCoordinacion: "",
  estudios: [],
  redesSociales: [],
  contactosEmergencia: [],
  ingresos: [],
  conceptosComposicion: [],
  status: "ACTIVO",
  usuario: "",
  password: "",
};

export type DirigenteDTO = {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: string;
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
  referente: {
    id: string;
    nombre: string;
    primerApellido: string;
    segundoApellido: string | null;
  } | null;
  antecedentesPoliticos: string | null;
  notasCoordinacion: string | null;
  status: StatusDirigente;
  unidadTerritorial: {
    id: string;
    clave: string;
    nombre: string;
    tipoUt: string | null;
  } | null;
  estudios: {
    id: string;
    descripcion: string;
    institucion: string | null;
    anioEgreso: number | null;
    cedula: string | null;
    certificado: boolean;
    otros: string | null;
  }[];
  redesSociales: {
    id: string;
    descripcion: string;
    cuenta: string;
  }[];
  contactosEmergencia: {
    id: string;
    nombre: string;
    parentesco: string;
    telefono: string;
  }[];
  ingresos: {
    id: string;
    tipoIngreso: string;
    monto: number;
  }[];
  conceptosComposicion: ConceptoComposicionDTO[];
  desglose: DesgloseSueldo;
  activo: boolean;
  codigoQr: string;
  qrUrl: string;
  qrPayload?: string;
  usuario: string | null;
  password: string | null;
  createdAt: string;
  updatedAt: string;
};

export function dtoToFormValues(d: DirigenteDTO): DirigenteFormValues {
  return {
    nombre: d.nombre,
    primerApellido: d.primerApellido,
    segundoApellido: d.segundoApellido ?? "",
    fechaNacimiento: d.fechaNacimiento,
    telefonoCelular: d.telefonoCelular,
    correo: d.correo,
    fotoUrl: d.fotoUrl,
    alias: d.alias ?? "",
    curp: d.curp ?? "",
    tieneIne: d.tieneIne,
    ineFrenteUrl: d.ineFrenteUrl ?? "",
    ineReversoUrl: d.ineReversoUrl ?? "",
    tipo: d.tipo as DirigenteFormValues["tipo"],
    seccionElectoral: valorCatalogoParaFormulario(
      d.seccionElectoral,
      SECCIONES_ELECTORALES_COYOACAN,
    ) as DirigenteFormValues["seccionElectoral"],
    distritoFederal: d.distritoFederal ?? undefined,
    distritoLocal:
      d.distritoLocal === 26 || d.distritoLocal === 30 ? d.distritoLocal : undefined,
    colonia: valorCatalogoParaFormulario(d.colonia, NOMBRES_COLONIAS_COYOACAN) as DirigenteFormValues["colonia"],
    calle: d.calle,
    numeroExterior: d.numeroExterior,
    numeroInterior: d.numeroInterior ?? "",
    codigoPostal: d.codigoPostal,
    alcaldia: valorCatalogoParaFormulario(d.alcaldia, ["Coyoacán"] as const) as DirigenteFormValues["alcaldia"],
    estadoRepublica: valorCatalogoParaFormulario(d.estadoRepublica, [
      "Ciudad de México",
    ] as const) as DirigenteFormValues["estadoRepublica"],
    unidadTerritorialId: d.unidadTerritorial?.id ?? null,
    filiacion: (d.filiacion
      ? valorCatalogoParaFormulario(d.filiacion, FILIACIONES_PARTIDO)
      : null) as DirigenteFormValues["filiacion"],
    aspiracionCortoPlazo: d.aspiracionCortoPlazo ?? "",
    aspiracionLargoPlazo: d.aspiracionLargoPlazo ?? "",
    referenteId: d.referenteId ?? "",
    antecedentesPoliticos: d.antecedentesPoliticos ?? "",
    notasCoordinacion: d.notasCoordinacion ?? "",
    estudios: d.estudios.map((e) => ({
      descripcion: e.descripcion,
      institucion: e.institucion ?? "",
      anioEgreso: e.anioEgreso ?? undefined,
      cedula: e.cedula ?? "",
      certificado: e.certificado,
      otros: e.otros ?? "",
    })),
    redesSociales: d.redesSociales.map((r) => ({
      descripcion: valorCatalogoParaFormulario(
        r.descripcion,
        TIPOS_RED_SOCIAL,
      ) as DirigenteFormValues["redesSociales"][number]["descripcion"],
      cuenta: r.cuenta,
    })),
    contactosEmergencia: d.contactosEmergencia.map((c) => ({
      nombre: c.nombre,
      parentesco: valorCatalogoParaFormulario(
        c.parentesco,
        PARENTESCOS_EMERGENCIA,
      ) as DirigenteFormValues["contactosEmergencia"][number]["parentesco"],
      telefono: c.telefono,
    })),
    ingresos: d.ingresos.map((i) => ({
      tipoIngreso: i.tipoIngreso,
      monto: i.monto,
    })),
    conceptosComposicion: d.conceptosComposicion.map((c) => ({
      concepto: c.concepto,
      monto: c.monto,
      nombre: c.nombre ?? "",
      tipoDetalle: c.tipoDetalle ?? "",
    })),
    status: d.status,
    usuario: d.usuario ?? usuarioDesdeNombreApellido(d.nombre, d.primerApellido),
    password: "",
  };
}
