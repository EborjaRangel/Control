import { prisma } from "./prisma.js";
import { nombreCompleto } from "./dirigentes.js";
import { esSeccionValida } from "./secciones-electorales.js";
import { validarSeccionParaColonia } from "./unidades-territoriales.js";
import { nombreColoniaCatalogo } from "./colonias.js";

export function representanteEstaCapturado(rep: {
  ineFrenteUrl: string;
  ineReversoUrl: string;
  nombre: string;
  primerApellido: string;
  colonia: string;
  calle: string;
  codigoPostal: string;
}) {
  return Boolean(
    rep.ineFrenteUrl?.trim() &&
      rep.ineReversoUrl?.trim() &&
      rep.nombre?.trim() &&
      rep.primerApellido?.trim() &&
      rep.colonia?.trim() &&
      rep.calle?.trim() &&
      rep.codigoPostal?.trim(),
  );
}

const repInclude = {
  responsableColonia: {
    select: {
      id: true,
      colonia: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
    },
  },
  responsableGeneral: {
    select: {
      id: true,
      nombre: true,
      primerApellido: true,
      segundoApellido: true,
      dirigente: { select: { distritoLocal: true } },
    },
  },
} as const;

export async function seccionAsignableARepresentante(
  rep: {
    colonia: string;
    responsableColonia: { colonia: string } | null;
    responsableGeneral: { dirigente: { distritoLocal: number | null } | null } | null;
  },
  seccionElectoral: string,
) {
  if (!esSeccionValida(seccionElectoral)) {
    return "Sección electoral no válida para Coyoacán";
  }

  if (rep.responsableColonia) {
    return validarSeccionParaColonia(
      nombreColoniaCatalogo(rep.responsableColonia.colonia),
      seccionElectoral,
    );
  }

  if (rep.responsableGeneral) {
    return validarSeccionParaColonia(nombreColoniaCatalogo(rep.colonia), seccionElectoral);
  }

  return "Representante sin responsable vinculado";
}

export async function listarRepresentantesParaAsignacion(seccionElectoral: string) {
  if (!esSeccionValida(seccionElectoral)) return null;

  const reps = await prisma.representanteCasilla.findMany({
    where: { activo: true },
    include: repInclude,
    orderBy: [{ validado: "desc" }, { primerApellido: "asc" }, { nombre: "asc" }],
  });

  const items = await Promise.all(
    reps.map(async (rep) => {
      const capturado = representanteEstaCapturado(rep);
      const errorAsignacion = capturado
        ? await seccionAsignableARepresentante(rep, seccionElectoral)
        : "Registro incompleto";
      const operador =
        rep.responsableColonia != null
          ? {
              tipo: "RC" as const,
              id: rep.responsableColonia.id,
              nombreCompleto: nombreCompleto(rep.responsableColonia),
              colonia: rep.responsableColonia.colonia,
            }
          : rep.responsableGeneral != null
            ? {
                tipo: "RG" as const,
                id: rep.responsableGeneral.id,
                nombreCompleto: nombreCompleto(rep.responsableGeneral),
                distritoLocal: rep.responsableGeneral.dirigente?.distritoLocal ?? null,
              }
            : null;

      return {
        id: rep.id,
        nombreCompleto: nombreCompleto(rep),
        seccionElectoral: rep.seccionElectoral,
        colonia: rep.colonia,
        capturado,
        validado: rep.validado,
        operador,
        asignable: capturado && rep.validado && errorAsignacion == null,
        motivoNoAsignable:
          !capturado
            ? "Faltan datos o fotos de credencial"
            : !rep.validado
              ? "Pendiente de validación por staff"
              : errorAsignacion,
      };
    }),
  );

  return { seccionElectoral, representantes: items };
}

export async function asignarSeccionARepresentantes(seccionElectoral: string, ids: string[]) {
  if (!esSeccionValida(seccionElectoral)) {
    return { error: "Sección electoral no válida" as const };
  }
  if (!ids.length) {
    return { error: "Selecciona al menos un representante" as const };
  }

  const resultados: Array<{
    id: string;
    ok: boolean;
    error?: string;
    seccionAnterior?: string;
    seccionNueva?: string;
  }> = [];

  for (const id of ids) {
    const rep = await prisma.representanteCasilla.findFirst({
      where: { id, activo: true },
      include: repInclude,
    });
    if (!rep) {
      resultados.push({ id, ok: false, error: "Representante no encontrado" });
      continue;
    }
    if (!representanteEstaCapturado(rep)) {
      resultados.push({ id, ok: false, error: "Registro incompleto" });
      continue;
    }
    if (!rep.validado) {
      resultados.push({ id, ok: false, error: "Debe estar validado por staff" });
      continue;
    }
    const seccionError = await seccionAsignableARepresentante(rep, seccionElectoral);
    if (seccionError) {
      resultados.push({ id, ok: false, error: seccionError });
      continue;
    }

    await prisma.representanteCasilla.update({
      where: { id },
      data: { seccionElectoral },
    });
    resultados.push({ id, ok: true, seccionAnterior: rep.seccionElectoral, seccionNueva: seccionElectoral });
  }

  const asignados = resultados.filter((r) => r.ok).length;
  return { asignados, total: ids.length, resultados };
}

export async function marcarRepresentanteValidado(id: string, validado: boolean) {
  const rep = await prisma.representanteCasilla.findFirst({ where: { id, activo: true } });
  if (!rep) return null;
  if (validado && !representanteEstaCapturado(rep)) {
    return { error: "Completa el registro antes de validar" as const };
  }
  const updated = await prisma.representanteCasilla.update({
    where: { id },
    data: { validado },
    include: repInclude,
  });
  return { representante: updated };
}
