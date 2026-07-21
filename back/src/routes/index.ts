import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { ValidationError } from "yup";
import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import {
  canAccessDirigente,
  hashPassword,
  isStaffRol,
  requireAuth,
  requireStaff,
  hasAdminPrivilegesRol,
  type AuthUser,
} from "../lib/auth.js";
import {
  normalizeUsername,
  PASSWORD_DEFECTO_USUARIO,
  resolverCredencialesCrear,
  resolverUsernameUnico,
} from "../lib/credenciales-usuario.js";
import {
  dirigenteCreateSchema,
  dirigenteUpdateSchema,
} from "../lib/validation.js";
import { serializeDirigente } from "../lib/serialize.js";
import {
  resolverUnidadTerritorialId,
  coloniasPorDistritoLocal,
  seccionesPorColonia,
  utsPorColonia,
  validarSeccionParaColonia,
  validarUnidadTerritorialParaColonia,
} from "../lib/unidades-territoriales.js";
import { mapaDeSeccion, geojsonAlcaldiaCoyoacan, geojsonSeccionesCoyoacan } from "../lib/seccion-mapa.js";
import { coberturaSeccionesCoyoacan } from "../lib/seccion-cobertura.js";
import {
  casillasDatasetDisponible,
  casillasDeSeccion,
  cargarCasillasCoyoacan,
  resumenCasillasPorSeccion,
} from "../lib/casillas-electorales.js";
import {
  asignarSeccionARepresentantes,
  listarRepresentantesParaAsignacion,
  marcarRepresentanteValidado,
} from "../lib/representante-asignacion.js";
import authRouter from "./auth.js";
import asistenciaRouter from "./asistencia.js";
import convocatoriaRouter from "./convocatoria.js";
import nominasRouter from "./nominas.js";
import detectadosRouter from "./detectados.js";
import rcRouter from "./rc.js";
import rgRouter from "./rg.js";
import notificacionesRouter from "./notificaciones.js";
import usuariosRouter from "./usuarios.js";
import { TIPOS_DIRIGENTE, compararNumeroDirigente, nombreCompleto } from "../lib/dirigentes.js";
import {
  buildFiltroBuscarDirigentes,
  filtroColoniaDirigente,
  filtroEstatusListado,
  modoEstatusListadoDirigentes,
} from "../lib/filtro-dirigentes.js";
import { generarCodigoQr } from "../lib/codigo-qr.js";
import { nominaCreateData, nominaInclude, upsertNomina } from "../lib/nomina-db.js";
import { recalcularResumenGlobalNomina } from "../lib/nomina-resumen.js";
import { normalizarDirigenteParaGuardado } from "../lib/normalizar-dirigente.js";
import { normalizarTextoGuardado } from "../lib/normalizar-texto.js";
import {
  dirigenteRelacionesInclude,
  dirigenteScalarData,
  syncDirigenteRelaciones,
} from "../lib/dirigente-db.js";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const TIPOS_OK = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;
const SAFE_UPLOAD_NAME = /^[a-f0-9-]+\.(jpg|jpeg|png|webp|gif)$/i;

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const ext = file.mimetype.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
      cb(null, `${randomUUID()}.${ext}`);
    },
  }),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    cb(null, TIPOS_OK.includes(file.mimetype));
  },
});

const restoreUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, _file, cb) => {
      const name =
        typeof req.query.filename === "string" ? req.query.filename.trim() : "";
      if (!name || !SAFE_UPLOAD_NAME.test(name)) {
        cb(new Error("Nombre de archivo inválido"), "");
        return;
      }
      cb(null, name);
    },
  }),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const extOk = SAFE_UPLOAD_NAME.test(file.originalname);
    cb(null, TIPOS_OK.includes(file.mimetype) || extOk);
  },
});

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function dirigenteInclude() {
  return {
    nomina: { include: nominaInclude },
    usuario: { select: { username: true, passwordPlano: true } },
    unidadTerritorial: true,
    ...dirigenteRelacionesInclude,
  } as const;
}

function detalleConflictoUnico(error: Prisma.PrismaClientKnownRequestError): string {
  const target = Array.isArray(error.meta?.target)
    ? (error.meta.target as string[]).join(", ")
    : String(error.meta?.target ?? "");
  const originalMessage = String(
    (error.meta as { driverAdapterError?: { cause?: { originalMessage?: string } } })
      ?.driverAdapterError?.cause?.originalMessage ?? "",
  );
  const modelName = String(error.meta?.modelName ?? "");
  const blob = `${target} ${originalMessage} ${modelName} ${error.message}`.toLowerCase();

  if (blob.includes("username")) {
    return "El nombre de usuario ya está en uso";
  }
  if (blob.includes("curp")) {
    return "La CURP ya está registrada en otro dirigente";
  }
  if (blob.includes("dirigenteid")) {
    return "Conflicto al vincular datos del dirigente. Recarga e intenta de nuevo.";
  }
  if (blob.includes("codigoqr")) {
    return "Conflicto con el código QR del dirigente";
  }
  if (target) return `Registro duplicado (${target})`;
  return "Registro duplicado: ya existe otro registro con ese valor";
}

function handleUniqueConflict(error: unknown, res: import("express").Response) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    res.status(409).json({ error: detalleConflictoUnico(error) });
    return true;
  }
  return false;
}

async function validarUnicosDirigente(
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  opts: {
    excludeDirigenteId?: string;
    excludeUsuarioId?: string;
    curp?: string | null;
    username: string;
  },
) {
  const { excludeDirigenteId, excludeUsuarioId, curp, username } = opts;
  const curpNorm = curp?.trim().toUpperCase() || null;
  if (curpNorm) {
    const otroCurp = await tx.dirigente.findFirst({
      where: {
        curp: curpNorm,
        ...(excludeDirigenteId ? { id: { not: excludeDirigenteId } } : {}),
      },
      select: { id: true },
    });
    if (otroCurp) {
      return "La CURP ya está registrada en otro dirigente";
    }
  }

  if (username) {
    const otroUsuario = await tx.usuario.findFirst({
      where: {
        username,
        ...(excludeUsuarioId ? { id: { not: excludeUsuarioId } } : {}),
      },
      select: { id: true },
    });
    if (otroUsuario) {
      return "El nombre de usuario ya está en uso";
    }
  }

  return null;
}

function serializeDirigenteForUser(
  dirigente: Parameters<typeof serializeDirigente>[0],
  user: AuthUser | undefined,
  options?: { revealPassword?: boolean },
) {
  return serializeDirigente(dirigente, {
    revealPassword: options?.revealPassword ?? isStaffRol(user?.rol),
    includeComposicionSueldo: hasAdminPrivilegesRol(user?.rol),
  });
}

router.use("/auth", authRouter);

router.use(requireAuth);

router.use("/asistencia", asistenciaRouter);
router.use("/convocatoria", convocatoriaRouter);
router.use("/nominas", nominasRouter);
router.use("/detectados", detectadosRouter);
router.use("/rc", rcRouter);
router.use("/rg", rgRouter);
router.use("/notificaciones", notificacionesRouter);
router.use("/usuarios", usuariosRouter);

router.get("/secciones/coyoacan/geojson", (_req, res) => {
  try {
    const geojson = geojsonSeccionesCoyoacan();
    if (!geojson.features.length) {
      res.status(503).json({
        error:
          "Polígonos oficiales no importados. Ejecuta npm run geo:import-secciones -w control-back",
      });
      return;
    }
    res.json(geojson);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar polígonos de secciones" });
  }
});

router.get("/secciones/coyoacan/cobertura", requireStaff, async (_req, res) => {
  try {
    res.json(await coberturaSeccionesCoyoacan());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar cobertura de secciones" });
  }
});

router.get("/secciones/coyoacan/alcaldia", (_req, res) => {
  try {
    res.json(geojsonAlcaldiaCoyoacan());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar contorno de la alcaldía" });
  }
});

router.get("/secciones/:numero/mapa", (req, res) => {
  try {
    const numero = paramId(req.params.numero);
    const colonia =
      typeof req.query.colonia === "string" ? req.query.colonia.trim() : undefined;
    const mapa = mapaDeSeccion(numero, colonia || null);
    if (!mapa) {
      res.status(404).json({ error: "Sección electoral no válida para Coyoacán" });
      return;
    }
    res.json(mapa);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar mapa de la sección" });
  }
});

router.get("/electoral/casillas/catalogo", (_req, res) => {
  try {
    if (!casillasDatasetDisponible()) {
      res.status(503).json({
        error:
          "Catálogo de casillas no importado. Ejecuta npm run electoral:import-casillas -w control-back",
      });
      return;
    }
    const data = cargarCasillasCoyoacan();
    res.json({
      vigencia: data.vigencia,
      fuente: data.fuente,
      urlFuente: data.urlFuente,
      totalCasillas: data.totalCasillas,
      totalSecciones: data.totalSecciones,
      porSeccion: data.porSeccion,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar catálogo de casillas" });
  }
});

router.get("/electoral/casillas/resumen", (_req, res) => {
  try {
    if (!casillasDatasetDisponible()) {
      res.status(503).json({
        error:
          "Catálogo de casillas no importado. Ejecuta npm run electoral:import-casillas -w control-back",
      });
      return;
    }
    const data = cargarCasillasCoyoacan();
    res.json({
      vigencia: data.vigencia,
      fuente: data.fuente,
      urlFuente: data.urlFuente,
      totalCasillas: data.totalCasillas,
      totalSecciones: data.totalSecciones,
      porSeccion: resumenCasillasPorSeccion(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar resumen de casillas" });
  }
});

router.get("/electoral/casillas/seccion/:numero", (req, res) => {
  try {
    if (!casillasDatasetDisponible()) {
      res.status(503).json({
        error:
          "Catálogo de casillas no importado. Ejecuta npm run electoral:import-casillas -w control-back",
      });
      return;
    }
    const numero = paramId(req.params.numero);
    const info = casillasDeSeccion(numero);
    if (!info) {
      res.status(404).json({ error: "Sección no válida o sin casillas registradas" });
      return;
    }
    res.json(info);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar casillas de la sección" });
  }
});

router.get("/electoral/asignacion/representantes", requireStaff, async (req, res) => {
  try {
    const seccion =
      typeof req.query.seccion === "string" ? req.query.seccion.trim() : "";
    if (!seccion) {
      res.status(400).json({ error: "Indica el parámetro seccion" });
      return;
    }
    const data = await listarRepresentantesParaAsignacion(seccion);
    if (!data) {
      res.status(400).json({ error: "Sección electoral no válida" });
      return;
    }
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar representantes" });
  }
});

router.post("/electoral/asignacion/representantes", requireStaff, async (req, res) => {
  try {
    const seccionElectoral =
      typeof req.body?.seccionElectoral === "string" ? req.body.seccionElectoral.trim() : "";
    const ids = Array.isArray(req.body?.representanteIds)
      ? (req.body.representanteIds as unknown[]).filter((id): id is string => typeof id === "string")
      : [];
    const result = await asignarSeccionARepresentantes(seccionElectoral, ids);
    if ("error" in result && result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al asignar sección" });
  }
});

router.patch("/electoral/asignacion/representantes/:id/validado", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const validado = req.body?.validado === true;
    const result = await marcarRepresentanteValidado(id, validado);
    if (!result) {
      res.status(404).json({ error: "Representante no encontrado" });
      return;
    }
    if ("error" in result && result.error) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ ok: true, validado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar validación" });
  }
});

router.get("/colonias", async (req, res) => {
  try {
    const raw =
      typeof req.query.distritoLocal === "string" ? req.query.distritoLocal.trim() : "";
    const distritoLocal = raw ? Number(raw) : NaN;
    if (!raw || Number.isNaN(distritoLocal)) {
      res.status(400).json({ error: "Indica el parámetro distritoLocal" });
      return;
    }
    const colonias = await coloniasPorDistritoLocal(distritoLocal);
    res.json({ colonias, distritoLocal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar colonias" });
  }
});

router.get("/secciones-electorales", async (req, res) => {
  try {
    const colonia =
      typeof req.query.colonia === "string" ? req.query.colonia.trim() : "";
    if (!colonia) {
      res.status(400).json({ error: "Indica el parámetro colonia" });
      return;
    }
    const unidadTerritorialId =
      typeof req.query.unidadTerritorialId === "string"
        ? req.query.unidadTerritorialId.trim()
        : null;
    const secciones = await seccionesPorColonia(colonia, unidadTerritorialId || null);
    res.json({
      secciones: secciones ?? [],
      filtrado: secciones !== null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar secciones electorales" });
  }
});

router.get("/unidades-territoriales/catalogo", requireStaff, async (_req, res) => {
  try {
    const uts = await prisma.unidadTerritorial.findMany({
      orderBy: [{ nombre: "asc" }],
      select: { id: true, clave: true, nombre: true, tipoUt: true, distritoLocal: true },
    });
    res.json(uts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar catálogo de UTs" });
  }
});

router.get("/unidades-territoriales", async (req, res) => {
  try {
    const colonia =
      typeof req.query.colonia === "string" ? req.query.colonia.trim() : "";
    if (!colonia) {
      res.status(400).json({ error: "Indica el parámetro colonia" });
      return;
    }
    const uts = await utsPorColonia(colonia);
    res.json(uts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar unidades territoriales" });
  }
});

router.get("/dirigentes", async (req, res) => {
  try {
    const user = req.user!;
    const modoEstatus = modoEstatusListadoDirigentes(req.query);
    const incluirBajas = modoEstatus === "baja";
    const buscar = typeof req.query.buscar === "string" ? req.query.buscar.trim() : "";
    const tipo = typeof req.query.tipo === "string" ? req.query.tipo.trim() : "";
    const colonia = typeof req.query.colonia === "string" ? req.query.colonia.trim() : "";
    const seccionElectoral =
      typeof req.query.seccionElectoral === "string" ? req.query.seccionElectoral.trim() : "";
    const unidadTerritorialId =
      typeof req.query.unidadTerritorialId === "string" ? req.query.unidadTerritorialId.trim() : "";
    const disponibleParaRc = req.query.disponibleParaRc === "true";
    const disponibleParaRg = req.query.disponibleParaRg === "true";

    if (user.rol === "DIRIGENTE") {
      if (!user.dirigenteId) {
        res.status(403).json({ error: "Cuenta de dirigente sin registro vinculado" });
        return;
      }
      const dirigente = await prisma.dirigente.findUnique({
        where: { id: user.dirigenteId },
        include: dirigenteInclude(),
      });
      res.json(dirigente ? [serializeDirigenteForUser(dirigente, user)] : []);
      return;
    }

    const revealPassword = isStaffRol(user.rol);

    const tipoValido =
      tipo && (TIPOS_DIRIGENTE as readonly string[]).includes(tipo)
        ? (tipo as (typeof TIPOS_DIRIGENTE)[number])
        : undefined;

    const filtroColonia = colonia ? filtroColoniaDirigente(colonia) : undefined;

    const esSeleccionRcRg = disponibleParaRc || disponibleParaRg;
    const filtroEstatus = esSeleccionRcRg && incluirBajas
      ? {}
      : filtroEstatusListado(incluirBajas);

    const filtroBuscar = buscar ? await buildFiltroBuscarDirigentes(buscar) : undefined;

    const dirigentes = await prisma.dirigente.findMany({
      where: {
        ...filtroEstatus,
        ...(disponibleParaRc ? { responsableColonia: null } : {}),
        ...(disponibleParaRg ? { responsableGeneral: null } : {}),
        ...(tipoValido ? { tipo: tipoValido } : {}),
        ...(filtroColonia ?? {}),
        ...(seccionElectoral ? { seccionElectoral } : {}),
        ...(unidadTerritorialId ? { unidadTerritorialId } : {}),
        ...(filtroBuscar ?? {}),
      },
      include: dirigenteInclude(),
    });

    dirigentes.sort(compararNumeroDirigente);

    res.json(dirigentes.map((d) => serializeDirigenteForUser(d, user, { revealPassword })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar dirigentes" });
  }
});

router.post("/dirigentes", requireStaff, async (req, res) => {
  try {
    const data = await dirigenteCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const utError = await validarUnidadTerritorialParaColonia(
      data.colonia,
      data.unidadTerritorialId ?? null,
    );
    if (utError) {
      res.status(400).json({ error: utError });
      return;
    }
    const unidadTerritorialId = await resolverUnidadTerritorialId(
      data.colonia,
      data.unidadTerritorialId ?? null,
    );

    const seccionError = await validarSeccionParaColonia(
      data.colonia,
      data.seccionElectoral,
      unidadTerritorialId,
    );
    if (seccionError) {
      res.status(400).json({ error: seccionError });
      return;
    }

    const guardado = normalizarDirigenteParaGuardado(data);
    const credenciales = resolverCredencialesCrear({
      usuario: data.usuario,
      password: data.password,
      nombre: guardado.nombre,
      primerApellido: guardado.primerApellido,
    });

    const dirigente = await prisma.$transaction(async (tx) => {
      const usernameUnico = await resolverUsernameUnico(
        tx,
        guardado.nombre,
        guardado.primerApellido,
        { preferido: credenciales.username },
      );
      const duplicado = await validarUnicosDirigente(tx, {
        curp: guardado.curp,
        username: usernameUnico,
      });
      if (duplicado) {
        throw new Error(`VALIDACION:${duplicado}`);
      }

      const created = await tx.dirigente.create({
        data: {
          ...(dirigenteScalarData(guardado) as Prisma.DirigenteUncheckedCreateInput),
          codigoQr: generarCodigoQr(),
          unidadTerritorialId,
          nomina: {
            create: nominaCreateData(
              hasAdminPrivilegesRol(req.user!.rol) ? guardado : { conceptosComposicion: [] },
            ),
          },
        },
      });

      await syncDirigenteRelaciones(tx, created.id, guardado);

      await recalcularResumenGlobalNomina(tx);

      await tx.usuario.create({
        data: {
          username: usernameUnico,
          passwordHash: await hashPassword(credenciales.password),
          passwordPlano: credenciales.password,
          rol: "DIRIGENTE",
          dirigenteId: created.id,
        },
      });

      return tx.dirigente.findUniqueOrThrow({
        where: { id: created.id },
        include: dirigenteInclude(),
      });
    });

    res.status(201).json(serializeDirigenteForUser(dirigente, req.user, { revealPassword: true }));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    if (error instanceof Error && error.message.startsWith("VALIDACION:")) {
      res.status(409).json({ error: error.message.replace(/^VALIDACION:/, "") });
      return;
    }
    if (handleUniqueConflict(error, res)) return;
    console.error(error);
    res.status(500).json({ error: "Error al crear dirigente" });
  }
});

router.get("/dirigentes/:id", async (req, res) => {
  try {
    const id = paramId(req.params.id);
    if (!(await canAccessDirigente(req, id))) {
      res.status(403).json({ error: "No tienes permiso para ver este dirigente" });
      return;
    }

    const dirigente = await prisma.dirigente.findUnique({
      where: { id },
      include: dirigenteInclude(),
    });
    if (!dirigente) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    res.json(serializeDirigenteForUser(dirigente, req.user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener dirigente" });
  }
});

router.put("/dirigentes/:id", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);

    const existing = await prisma.dirigente.findUnique({
      where: { id },
      include: { usuario: true },
    });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    const data = await dirigenteUpdateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const usernameRaw = data.usuario?.trim();
    const username = usernameRaw ? normalizeUsername(usernameRaw) : "";
    const password = data.password?.trim() || undefined;
    const usernameActual = existing.usuario?.username ?? null;

    const utError = await validarUnidadTerritorialParaColonia(
      data.colonia,
      data.unidadTerritorialId ?? null,
    );
    if (utError) {
      res.status(400).json({ error: utError });
      return;
    }
    const unidadTerritorialId = await resolverUnidadTerritorialId(
      data.colonia,
      data.unidadTerritorialId ?? null,
    );

    const seccionError = await validarSeccionParaColonia(
      data.colonia,
      data.seccionElectoral,
      unidadTerritorialId,
    );
    if (seccionError) {
      res.status(400).json({ error: seccionError });
      return;
    }

    if (data.referenteId && data.referenteId === id) {
      res.status(400).json({ error: "El referente no puede ser el mismo dirigente" });
      return;
    }

    const guardado = normalizarDirigenteParaGuardado(data);
    const credencialesNuevo = resolverCredencialesCrear({
      usuario: data.usuario,
      password: data.password,
      nombre: guardado.nombre,
      primerApellido: guardado.primerApellido,
    });

    const dirigente = await prisma.$transaction(async (tx) => {
      const usernameParaValidar = existing.usuario
        ? username && username !== usernameActual
          ? username
          : ""
        : await resolverUsernameUnico(tx, guardado.nombre, guardado.primerApellido, {
            preferido: credencialesNuevo.username,
          });

      const duplicado = await validarUnicosDirigente(tx, {
        excludeDirigenteId: id,
        excludeUsuarioId: existing.usuario?.id,
        curp: guardado.curp,
        username: existing.usuario
          ? username && username !== usernameActual
            ? username
            : ""
          : usernameParaValidar,
      });
      if (duplicado) {
        throw new Error(`VALIDACION:${duplicado}`);
      }

      if (hasAdminPrivilegesRol(req.user!.rol)) {
        await upsertNomina(tx, id, guardado);
      }
      await syncDirigenteRelaciones(tx, id, guardado);
      const updated = await tx.dirigente.update({
        where: { id },
        data: {
          ...dirigenteScalarData(guardado),
          unidadTerritorialId,
        },
      });

      if (existing.usuario) {
        const actualizarUsuario =
          Boolean(password) || Boolean(username && username !== usernameActual);
        if (actualizarUsuario) {
          await tx.usuario.update({
            where: { id: existing.usuario.id },
            data: {
              ...(username && username !== usernameActual ? { username } : {}),
              ...(password
                ? {
                    passwordHash: await hashPassword(password),
                    passwordPlano: password,
                  }
                : {}),
            },
          });
        }
      } else {
        await tx.usuario.create({
          data: {
            username: usernameParaValidar,
            passwordHash: await hashPassword(credencialesNuevo.password),
            passwordPlano: credencialesNuevo.password,
            rol: "DIRIGENTE",
            dirigenteId: id,
          },
        });
      }

      return tx.dirigente.findUniqueOrThrow({
        where: { id: updated.id },
        include: dirigenteInclude(),
      });
    });

    res.json(serializeDirigenteForUser(dirigente, req.user));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    if (error instanceof Error && error.message.startsWith("VALIDACION:")) {
      res.status(409).json({ error: error.message.replace(/^VALIDACION:/, "") });
      return;
    }
    if (handleUniqueConflict(error, res)) return;
    console.error(error);
    res.status(500).json({ error: "Error al actualizar dirigente" });
  }
});

router.delete("/dirigentes/:id", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const reactivar = req.query.reactivar === "true";

    const existing = await prisma.dirigente.findUnique({
      where: { id },
      include: { usuario: true },
    });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    const dirigente = await prisma.$transaction(async (tx) => {
      if (existing.usuario) {
        await tx.usuario.update({
          where: { id: existing.usuario.id },
          data: { activo: reactivar },
        });
      }
      return tx.dirigente.update({
        where: { id },
        data: {
          activo: reactivar,
          status: reactivar ? "ACTIVO" : "BAJA",
        },
        include: dirigenteInclude(),
      });
    });

    res.json(serializeDirigenteForUser(dirigente, req.user));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
});

router.post("/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "La imagen supera 5 MB" });
        return;
      }
      res.status(400).json({ error: "Error al subir archivo" });
      return;
    }
    if (err) {
      res.status(400).json({ error: "Error al subir archivo" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No se envió ningún archivo o formato no permitido" });
      return;
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

router.post("/admin/uploads/restore", requireStaff, (req, res) => {
  restoreUpload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "La imagen supera 5 MB" });
        return;
      }
      res.status(400).json({ error: "Error al subir archivo" });
      return;
    }
    if (err) {
      const message = err instanceof Error ? err.message : "Error al subir archivo";
      res.status(400).json({ error: message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No se envió ningún archivo o formato no permitido" });
      return;
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});

export default router;
