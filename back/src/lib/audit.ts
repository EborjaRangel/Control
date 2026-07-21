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
