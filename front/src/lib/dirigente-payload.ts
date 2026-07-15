import { cpDeColonia, nombreColoniaCatalogo } from "./colonias";
import type { DirigenteFormValues } from "./validation";

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Recorta y tipifica valores del formulario antes de enviarlos al API. */
export function prepareDirigentePayload(
  values: DirigenteFormValues,
  modo: "crear" | "editar",
): DirigenteFormValues {
  const colonia = nombreColoniaCatalogo(values.colonia.trim());
  const codigoPostal = cpDeColonia(colonia) ?? values.codigoPostal.trim();

  const payload: DirigenteFormValues = {
    ...values,
    nombre: values.nombre.trim(),
    primerApellido: values.primerApellido.trim(),
    segundoApellido: values.segundoApellido?.trim() || "",
    alias: values.alias?.trim() || "",
    curp: values.curp?.trim().toUpperCase() || "",
    telefonoCelular: values.telefonoCelular.trim(),
    correo: values.correo.trim(),
    colonia,
    codigoPostal,
    calle: values.calle.trim(),
    numeroExterior: values.numeroExterior.trim(),
    numeroInterior: values.numeroInterior?.trim() || "",
    filiacion: emptyToNull(values.filiacion ?? "") as DirigenteFormValues["filiacion"],
    aspiracionCortoPlazo: values.aspiracionCortoPlazo?.trim() || "",
    aspiracionLargoPlazo: values.aspiracionLargoPlazo?.trim() || "",
    referenteId: emptyToNull(values.referenteId ?? ""),
    antecedentesPoliticos: values.antecedentesPoliticos?.trim() || "",
    notasCoordinacion: values.notasCoordinacion?.trim() || "",
    unidadTerritorialId: emptyToNull(values.unidadTerritorialId ?? ""),
    ineFrenteUrl: values.tieneIne ? values.ineFrenteUrl?.trim() || "" : "",
    ineReversoUrl: values.tieneIne ? values.ineReversoUrl?.trim() || "" : "",
    usuario: values.usuario.trim(),
    status: values.status ?? "ACTIVO",
    conceptosComposicion: (values.conceptosComposicion ?? []).map((c) => ({
      concepto: c.concepto,
      monto: toNumber(c.monto),
      nombre: emptyToNull(c.nombre ?? ""),
      tipoDetalle: emptyToNull(c.tipoDetalle ?? ""),
    })),
    estudios: (values.estudios ?? [])
      .filter((e) => e.descripcion.trim())
      .map((e) => ({
        descripcion: e.descripcion.trim(),
        institucion: emptyToNull(e.institucion ?? "") ?? "",
        anioEgreso: e.anioEgreso,
        cedula: emptyToNull(e.cedula ?? "") ?? "",
        certificado: Boolean(e.certificado),
        otros: emptyToNull(e.otros ?? "") ?? "",
      })),
    redesSociales: (values.redesSociales ?? [])
      .filter((r) => r.cuenta.trim())
      .map((r) => ({
        descripcion: r.descripcion,
        cuenta: r.cuenta.trim(),
      })),
    contactosEmergencia: (values.contactosEmergencia ?? [])
      .filter((c) => c.nombre.trim())
      .map((c) => ({
        nombre: c.nombre.trim(),
        parentesco: c.parentesco,
        telefono: c.telefono.trim(),
      })),
    ingresos: (values.ingresos ?? [])
      .filter((i) => i.tipoIngreso.trim())
      .map((i) => ({
        tipoIngreso: i.tipoIngreso.trim(),
        monto: toNumber(i.monto),
      })),
  };

  if (modo === "editar") {
    const password = values.password?.trim();
    payload.password = password ? password : undefined;
  } else {
    payload.password = values.password?.trim() ?? "";
  }

  return payload;
}
