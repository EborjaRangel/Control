import type { DirigenteFormPayload } from "./validation-dirigente-extra.js";
import type { NominaPayload } from "./nomina-db.js";
import {
  normalizarTextoGuardado,
  normalizarTextoGuardadoNullable,
} from "./normalizar-texto.js";

type DirigenteConNomina = DirigenteFormPayload & NominaPayload;

function normalizarOpcional(value: string | null | undefined): string | null {
  return normalizarTextoGuardadoNullable(value);
}

/** Normaliza texto libre; conserva vacío como cadena vacía (campos no nullable en formulario). */
function normalizarCadena(value: string | null | undefined): string {
  return normalizarTextoGuardado(value);
}

export function normalizarDirigenteParaGuardado<T extends DirigenteConNomina>(data: T): T {
  return {
    ...data,
    nombre: normalizarCadena(data.nombre),
    primerApellido: normalizarCadena(data.primerApellido),
    segundoApellido: normalizarCadena(data.segundoApellido) || null,
    telefonoCelular: data.telefonoCelular.trim(),
    correo: data.correo.trim().toLowerCase(),
    alias: normalizarOpcional(data.alias),
    curp: data.curp?.trim().toUpperCase() || null,
    ineFrenteUrl: data.tieneIne ? data.ineFrenteUrl?.trim() || null : null,
    ineReversoUrl: data.tieneIne ? data.ineReversoUrl?.trim() || null : null,
    seccionElectoral: normalizarCadena(data.seccionElectoral),
    colonia: normalizarCadena(data.colonia),
    calle: normalizarCadena(data.calle),
    numeroExterior: normalizarCadena(data.numeroExterior),
    numeroInterior: normalizarOpcional(data.numeroInterior),
    codigoPostal: data.codigoPostal.trim(),
    alcaldia: normalizarCadena(data.alcaldia ?? "Coyoacán"),
    estadoRepublica: normalizarCadena(data.estadoRepublica ?? "Ciudad de México"),
    filiacion: data.filiacion ? normalizarCadena(data.filiacion) : null,
    aspiracionCortoPlazo: normalizarOpcional(data.aspiracionCortoPlazo),
    aspiracionLargoPlazo: normalizarOpcional(data.aspiracionLargoPlazo),
    antecedentesPoliticos: normalizarOpcional(data.antecedentesPoliticos),
    notasCoordinacion: normalizarOpcional(data.notasCoordinacion),
    estudios: (data.estudios ?? []).map((e) => ({
      descripcion: normalizarCadena(e.descripcion),
      institucion: normalizarOpcional(e.institucion),
      anioEgreso: e.anioEgreso ?? null,
      cedula: normalizarOpcional(e.cedula),
      certificado: Boolean(e.certificado),
      otros: normalizarOpcional(e.otros),
    })),
    redesSociales: (data.redesSociales ?? []).map((r) => ({
      descripcion: normalizarCadena(r.descripcion),
      cuenta: normalizarCadena(r.cuenta),
    })),
    contactosEmergencia: (data.contactosEmergencia ?? []).map((c) => ({
      nombre: normalizarCadena(c.nombre),
      parentesco: normalizarCadena(c.parentesco),
      telefono: c.telefono.trim(),
    })),
    ingresos: (data.ingresos ?? []).map((i) => ({
      tipoIngreso: normalizarCadena(i.tipoIngreso),
      monto: i.monto ?? 0,
    })),
    conceptosComposicion: (data.conceptosComposicion ?? []).map((c) => ({
      concepto: c.concepto,
      monto: c.monto,
      nombre: normalizarOpcional(c.nombre),
      tipoDetalle: normalizarOpcional(c.tipoDetalle),
    })),
  };
}

export function normalizarNominaParaGuardado<T extends NominaPayload>(data: T): T {
  return {
    ...data,
    conceptosComposicion: (data.conceptosComposicion ?? []).map((c) => ({
      concepto: c.concepto,
      monto: c.monto,
      nombre: normalizarOpcional(c.nombre),
      tipoDetalle: normalizarOpcional(c.tipoDetalle),
    })),
  };
}
