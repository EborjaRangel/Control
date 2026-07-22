import type { Request } from "express";
import type { Prisma } from "../generated/prisma/client.js";
import type { AuditAccion, RolUsuario } from "../generated/prisma/client.js";
import type { AuthUser } from "./auth.js";
import { prisma } from "./prisma.js";

export type AuditCambio = {
  antes: unknown;
  despues: unknown;
};

export type RegistrarAuditoriaInput = {
  accion: AuditAccion;
  entidad: string;
  entidadId?: string | null;
  entidadLabel?: string | null;
  antes?: Record<string, unknown> | null;
  despues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  dirigenteId?: string | null;
  rcId?: string | null;
  rgId?: string | null;
  usuario?: AuthUser | null;
};

const CAMPOS_REDACTAR = new Set([
  "password",
  "passwordHash",
  "passwordPlano",
  "token",
]);

function redactarValor(key: string, value: unknown): unknown {
  if (CAMPOS_REDACTAR.has(key)) {
    return value == null ? null : "[REDACTADO]";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === "object" && !Array.isArray(item)
        ? sanitizarObjeto(item as Record<string, unknown>)
        : item,
    );
  }
  if (value && typeof value === "object") {
    return sanitizarObjeto(value as Record<string, unknown>);
  }
  return value;
}

export function sanitizarObjeto(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = redactarValor(key, value);
  }
  return out;
}

function valoresIguales(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function calcularCambios(
  antes: Record<string, unknown> | null | undefined,
  despues: Record<string, unknown> | null | undefined,
): Record<string, AuditCambio> | null {
  const a = sanitizarObjeto(antes ?? {});
  const d = sanitizarObjeto(despues ?? {});
  const keys = new Set([...Object.keys(a), ...Object.keys(d)]);
  const cambios: Record<string, AuditCambio> = {};

  for (const key of keys) {
    const va = a[key];
    const vd = d[key];
    if (!valoresIguales(va, vd)) {
      cambios[key] = { antes: va ?? null, despues: vd ?? null };
    }
  }

  return Object.keys(cambios).length > 0 ? cambios : null;
}

function metadataRequest(req?: Request): Record<string, unknown> {
  if (!req) return {};
  return {
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip,
    userAgent: req.headers["user-agent"] ?? null,
  };
}

export async function registrarAuditoria(
  req: Request | undefined,
  input: RegistrarAuditoriaInput,
  tx?: Prisma.TransactionClient,
) {
  const client = tx ?? prisma;
  const usuario = input.usuario ?? req?.user ?? null;
  const cambios = calcularCambios(input.antes, input.despues);
  const metadata = {
    ...metadataRequest(req),
    ...(input.metadata ?? {}),
  };

  await client.auditLog.create({
    data: {
      accion: input.accion,
      entidad: input.entidad,
      entidadId: input.entidadId ?? null,
      entidadLabel: input.entidadLabel ?? null,
      usuarioId: usuario?.sub ?? null,
      usuarioNombre: usuario?.username ?? null,
      usuarioRol: (usuario?.rol as RolUsuario | undefined) ?? null,
      dirigenteId: input.dirigenteId ?? usuario?.dirigenteId ?? null,
      rcId: input.rcId ?? usuario?.rcId ?? null,
      rgId: input.rgId ?? usuario?.rgId ?? null,
      cambios: cambios ? (cambios as Prisma.InputJsonValue) : undefined,
      metadata: Object.keys(metadata).length > 0 ? (metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}

export function snapshotUsuarioStaff(u: {
  username: string;
  rol: string;
  activo: boolean;
}) {
  return sanitizarObjeto({
    username: u.username,
    rol: u.rol,
    activo: u.activo,
  });
}

export function snapshotDirigenteEstado(u: {
  activo: boolean;
  status: string;
}) {
  return sanitizarObjeto({
    activo: u.activo,
    status: u.status,
  });
}

export function snapshotDirigenteBasico(d: {
  id: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  tipo: string;
  colonia: string;
  seccionElectoral: string;
  activo: boolean;
  status: string;
  correo: string;
  telefonoCelular: string;
}) {
  return sanitizarObjeto({
    id: d.id,
    nombre: d.nombre,
    primerApellido: d.primerApellido,
    segundoApellido: d.segundoApellido,
    tipo: d.tipo,
    colonia: d.colonia,
    seccionElectoral: d.seccionElectoral,
    activo: d.activo,
    status: d.status,
    correo: d.correo,
    telefonoCelular: d.telefonoCelular,
  });
}

export function snapshotNomina(n: {
  conceptos?: Array<{ concepto: string; monto: unknown; nombre?: string | null }>;
}) {
  return sanitizarObjeto({
    conceptos: (n.conceptos ?? []).map((c) => ({
      concepto: c.concepto,
      monto: Number(c.monto),
      nombre: c.nombre ?? null,
    })),
  });
}

export function snapshotDetectado(d: {
  id: string;
  dirigenteId: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  telefonoCelular: string | null;
  seccionElectoral: string;
  activo: boolean;
}) {
  return sanitizarObjeto({
    id: d.id,
    dirigenteId: d.dirigenteId,
    nombre: d.nombre,
    primerApellido: d.primerApellido,
    segundoApellido: d.segundoApellido,
    telefonoCelular: d.telefonoCelular,
    seccionElectoral: d.seccionElectoral,
    activo: d.activo,
  });
}

export function snapshotPersonaDetectada(p: {
  id: string;
  detectadoId: string;
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
  activo: boolean;
}) {
  return sanitizarObjeto({
    id: p.id,
    detectadoId: p.detectadoId,
    nombre: p.nombre,
    primerApellido: p.primerApellido,
    segundoApellido: p.segundoApellido,
    fechaNacimiento: p.fechaNacimiento.toISOString().slice(0, 10),
    sexo: p.sexo,
    claveElector: p.claveElector,
    curp: p.curp,
    seccionElectoral: p.seccionElectoral,
    colonia: p.colonia,
    calle: p.calle,
    numeroExterior: p.numeroExterior,
    numeroInterior: p.numeroInterior,
    codigoPostal: p.codigoPostal,
    activo: p.activo,
  });
}

export function snapshotOperador(o: {
  id: string;
  dirigenteId?: string | null;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  telefonoCelular: string | null;
  colonia?: string | null;
  activo: boolean;
  usuario?: { username: string } | null;
}) {
  return sanitizarObjeto({
    id: o.id,
    dirigenteId: o.dirigenteId ?? null,
    nombre: o.nombre,
    primerApellido: o.primerApellido,
    segundoApellido: o.segundoApellido,
    telefonoCelular: o.telefonoCelular,
    colonia: o.colonia ?? null,
    activo: o.activo,
    username: o.usuario?.username ?? null,
  });
}

export function snapshotRepresentante(r: {
  id: string;
  responsableColoniaId: string | null;
  responsableGeneralId: string | null;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  seccionElectoral: string;
  colonia: string;
  activo: boolean;
  validado: boolean;
}) {
  return sanitizarObjeto({
    id: r.id,
    responsableColoniaId: r.responsableColoniaId,
    responsableGeneralId: r.responsableGeneralId,
    nombre: r.nombre,
    primerApellido: r.primerApellido,
    segundoApellido: r.segundoApellido,
    seccionElectoral: r.seccionElectoral,
    colonia: r.colonia,
    activo: r.activo,
    validado: r.validado,
  });
}

export function snapshotServicioUrbano(r: {
  id: string;
  folio: string;
  dirigenteId: string;
  tipo: string;
  descripcion: string | null;
  colonia: string | null;
  seccionElectoral: string | null;
  direccion: string;
  lat: number;
  lng: number;
  estatus: string;
  activo: boolean;
}) {
  return sanitizarObjeto({
    id: r.id,
    folio: r.folio,
    dirigenteId: r.dirigenteId,
    tipo: r.tipo,
    descripcion: r.descripcion,
    colonia: r.colonia,
    seccionElectoral: r.seccionElectoral,
    direccion: r.direccion,
    lat: r.lat,
    lng: r.lng,
    estatus: r.estatus,
    activo: r.activo,
  });
}

export function snapshotEventoAsistencia(e: {
  id: string;
  titulo: string;
  fecha: Date;
  hora: string;
  lugar: string;
  alcance: string;
  estado: string;
  colonia: string | null;
  seccionElectoral: string | null;
  unidadTerritorialId: string | null;
  distritoLocal: number | null;
  tipoDirigente: string | null;
}) {
  return sanitizarObjeto({
    id: e.id,
    titulo: e.titulo,
    fecha: e.fecha.toISOString().slice(0, 10),
    hora: e.hora,
    lugar: e.lugar,
    alcance: e.alcance,
    estado: e.estado,
    colonia: e.colonia,
    seccionElectoral: e.seccionElectoral,
    unidadTerritorialId: e.unidadTerritorialId,
    distritoLocal: e.distritoLocal,
    tipoDirigente: e.tipoDirigente,
  });
}

export async function auditarInicioSesion(
  req: Request | undefined,
  input: {
    exito: boolean;
    username: string;
    usuarioId?: string | null;
    rol?: string | null;
    motivo?: string;
    usuario?: AuthUser | null;
  },
) {
  await registrarAuditoria(req, {
    accion: "LOGIN",
    entidad: "Sesion",
    entidadId: input.usuarioId ?? null,
    entidadLabel: input.username,
    usuario: input.usuario ?? undefined,
    metadata: {
      exito: input.exito,
      evento: input.exito ? "inicio_sesion" : "intento_fallido",
      ...(input.motivo ? { motivo: input.motivo } : {}),
      ...(input.rol ? { rol: input.rol } : {}),
    },
    ...(input.exito && input.rol
      ? { despues: sanitizarObjeto({ username: input.username, rol: input.rol }) }
      : {}),
  });
}

export async function auditarCierreSesion(req: Request | undefined, usuario: AuthUser) {
  await registrarAuditoria(req, {
    accion: "LOGOUT",
    entidad: "Sesion",
    entidadId: usuario.sub,
    entidadLabel: usuario.username,
    usuario,
    metadata: { evento: "cierre_sesion" },
    antes: sanitizarObjeto({ username: usuario.username, rol: usuario.rol }),
  });
}
