import type { Prisma, StatusDirigente, TipoDirigente } from "../generated/prisma/client.js";
import type { DirigenteFormPayload } from "./validation-dirigente-extra.js";

export const dirigenteRelacionesInclude = {
  estudios: { orderBy: { descripcion: "asc" as const } },
  redesSociales: { orderBy: { descripcion: "asc" as const } },
  contactosEmergencia: { orderBy: { nombre: "asc" as const } },
  ingresos: { orderBy: { tipoIngreso: "asc" as const } },
  referente: {
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
    },
  },
} as const;

function mapEstudios(estudios: DirigenteFormPayload["estudios"]) {
  return (estudios ?? []).map((e) => ({
    descripcion: e.descripcion,
    institucion: e.institucion || null,
    anioEgreso: e.anioEgreso ?? null,
    cedula: e.cedula || null,
    certificado: Boolean(e.certificado),
    otros: e.otros || null,
  }));
}

function mapRedes(redes: DirigenteFormPayload["redesSociales"]) {
  return (redes ?? []).map((r) => ({
    descripcion: r.descripcion,
    cuenta: r.cuenta,
  }));
}

function mapContactos(contactos: DirigenteFormPayload["contactosEmergencia"]) {
  return (contactos ?? []).map((c) => ({
    nombre: c.nombre,
    parentesco: c.parentesco,
    telefono: c.telefono,
  }));
}

function mapIngresos(ingresos: DirigenteFormPayload["ingresos"]) {
  return (ingresos ?? []).map((i) => ({
    tipoIngreso: i.tipoIngreso.trim(),
    monto: i.monto ?? 0,
  }));
}

export function dirigenteScalarData(
  data: DirigenteFormPayload,
): Prisma.DirigenteUncheckedUpdateInput {
  return {
    nombre: data.nombre,
    primerApellido: data.primerApellido,
    segundoApellido: data.segundoApellido || null,
    fechaNacimiento: new Date(data.fechaNacimiento),
    telefonoCelular: data.telefonoCelular,
    correo: data.correo,
    fotoUrl: data.fotoUrl || null,
    alias: data.alias || null,
    curp: data.curp?.trim().toUpperCase() || null,
    tieneIne: Boolean(data.tieneIne),
    ineFrenteUrl: data.tieneIne ? data.ineFrenteUrl || null : null,
    ineReversoUrl: data.tieneIne ? data.ineReversoUrl || null : null,
    tipo: data.tipo as TipoDirigente,
    seccionElectoral: data.seccionElectoral,
    distritoFederal: data.distritoFederal ?? null,
    distritoLocal: data.distritoLocal ?? null,
    colonia: data.colonia,
    calle: data.calle,
    numeroExterior: data.numeroExterior,
    numeroInterior: data.numeroInterior || null,
    codigoPostal: data.codigoPostal,
    alcaldia: data.alcaldia?.trim() || "Coyoacán",
    estadoRepublica: data.estadoRepublica?.trim() || "Ciudad de México",
    filiacion: data.filiacion || null,
    aspiracionCortoPlazo: data.aspiracionCortoPlazo || null,
    aspiracionLargoPlazo: data.aspiracionLargoPlazo || null,
    referenteId: data.referenteId || null,
    antecedentesPoliticos: data.antecedentesPoliticos || null,
    notasCoordinacion: data.notasCoordinacion || null,
    status: data.status as StatusDirigente,
    activo: data.status === "ACTIVO",
  };
}

export async function syncDirigenteRelaciones(
  tx: Prisma.TransactionClient,
  dirigenteId: string,
  data: DirigenteFormPayload,
) {
  await tx.dirigenteEstudio.deleteMany({ where: { dirigenteId } });
  await tx.dirigenteRedSocial.deleteMany({ where: { dirigenteId } });
  await tx.dirigenteContactoEmergencia.deleteMany({ where: { dirigenteId } });
  await tx.ingresoDirigente.deleteMany({ where: { dirigenteId } });

  const estudios = mapEstudios(data.estudios);
  if (estudios.length) {
    await tx.dirigenteEstudio.createMany({ data: estudios.map((e) => ({ ...e, dirigenteId })) });
  }

  const redes = mapRedes(data.redesSociales);
  if (redes.length) {
    await tx.dirigenteRedSocial.createMany({ data: redes.map((r) => ({ ...r, dirigenteId })) });
  }

  const contactos = mapContactos(data.contactosEmergencia);
  if (contactos.length) {
    await tx.dirigenteContactoEmergencia.createMany({
      data: contactos.map((c) => ({ ...c, dirigenteId })),
    });
  }

  const ingresos = mapIngresos(data.ingresos);
  if (ingresos.length) {
    await tx.ingresoDirigente.createMany({ data: ingresos.map((i) => ({ ...i, dirigenteId })) });
  }
}
