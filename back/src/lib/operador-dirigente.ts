import { prisma } from "./prisma.js";

export async function cargarDirigenteParaOperador(dirigenteId: string) {
  return prisma.dirigente.findFirst({
    where: { id: dirigenteId, activo: true },
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
      telefonoCelular: true,
      colonia: true,
      responsableColonia: { select: { id: true } },
      responsableGeneral: { select: { id: true } },
    },
  });
}

export function datosRcDesdeDirigente(
  dirigente: NonNullable<Awaited<ReturnType<typeof cargarDirigenteParaOperador>>>,
) {
  return {
    dirigenteId: dirigente.id,
    nombre: dirigente.nombre,
    primerApellido: dirigente.primerApellido,
    segundoApellido: dirigente.segundoApellido,
    telefonoCelular: dirigente.telefonoCelular,
    colonia: dirigente.colonia,
  };
}

export function datosRgDesdeDirigente(
  dirigente: NonNullable<Awaited<ReturnType<typeof cargarDirigenteParaOperador>>>,
) {
  return {
    dirigenteId: dirigente.id,
    nombre: dirigente.nombre,
    primerApellido: dirigente.primerApellido,
    segundoApellido: dirigente.segundoApellido,
    telefonoCelular: dirigente.telefonoCelular,
  };
}

/** Crea el RC del dirigente si aún no existe (sin credenciales de acceso). */
export async function ensureRcForDirigente(dirigenteId: string) {
  const dirigente = await cargarDirigenteParaOperador(dirigenteId);
  if (!dirigente) return null;

  if (dirigente.responsableColonia) {
    return prisma.responsableColonia.findUnique({
      where: { id: dirigente.responsableColonia.id },
    });
  }

  return prisma.responsableColonia.create({
    data: datosRcDesdeDirigente(dirigente),
  });
}

/** Crea el RG del dirigente si aún no existe (sin credenciales de acceso). */
export async function ensureRgForDirigente(dirigenteId: string) {
  const dirigente = await cargarDirigenteParaOperador(dirigenteId);
  if (!dirigente) return null;

  if (dirigente.responsableGeneral) {
    return prisma.responsableGeneral.findUnique({
      where: { id: dirigente.responsableGeneral.id },
    });
  }

  return prisma.responsableGeneral.create({
    data: datosRgDesdeDirigente(dirigente),
  });
}
