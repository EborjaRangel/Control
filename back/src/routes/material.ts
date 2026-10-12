import { Router } from "express";
import { ValidationError } from "yup";
import { prisma } from "../lib/prisma.js";
import { rawCodigoDesdeEscaneo } from "../lib/escanear-asistencia.js";
import {
  cuerpoRespuestaEscaneoMaterial,
  procesarEscaneoMaterial,
} from "../lib/escanear-material.js";
import { compararDirigentePorApellidosNombre, nombreCompleto } from "../lib/dirigentes.js";
import { requireAsistenciaOrStaff, requireAuth, requireStaff } from "../lib/auth.js";
import { inhabilitarUsuariosPaseLista } from "../lib/escanear-asistencia.js";
import {
  etiquetaDistritoLocal,
  mensajeFueraVigencia,
  vigenciaEntregaMaterialActiva,
} from "../lib/material-entrega.js";
import { serializeEventoEntregaMaterial, serializeRegistroEntregaMaterial } from "../lib/serialize-material.js";
import { eventoEntregaMaterialCreateSchema } from "../lib/validation-material.js";
import { registrarAuditoria } from "../lib/audit.js";

const router = Router();

router.use(requireAuth);

function paramId(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

router.get("/eventos", requireStaff, async (req, res) => {
  try {
    const activos = req.query.activos === "true";
    const cerrados = req.query.cerrados === "true";

    const eventos = await prisma.eventoEntregaMaterial.findMany({
      where: activos
        ? { estado: { in: ["PROGRAMADO", "ABIERTO"] } }
        : cerrados
          ? { estado: "CERRADO" }
          : undefined,
      include: { _count: { select: { participantes: true, entregas: true } } },
      orderBy: [{ fechaInicio: "desc" }, { createdAt: "desc" }],
    });

    res.json(eventos.map(serializeEventoEntregaMaterial));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al listar entregas" });
  }
});

router.post("/eventos", requireStaff, async (req, res) => {
  try {
    const data = await eventoEntregaMaterialCreateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    const ids = [...new Set(data.participantes.map((p) => p.dirigenteId))];
    const encontrados = await prisma.dirigente.count({ where: { id: { in: ids }, activo: true, status: "ACTIVO" } });
    if (encontrados !== ids.length) {
      res.status(400).json({ error: "Uno o más dirigentes no son válidos o están inactivos" });
      return;
    }

    const evento = await prisma.$transaction(async (tx) => {
      const created = await tx.eventoEntregaMaterial.create({
        data: {
          titulo: data.titulo,
          fechaInicio: new Date(data.fechaInicio),
          fechaFin: new Date(data.fechaFin),
          creadoPorId: req.user!.sub,
        },
      });

      for (const p of data.participantes) {
        await tx.eventoEntregaMaterialDirigente.create({
          data: { eventoId: created.id, dirigenteId: p.dirigenteId },
        });
        for (const linea of p.lineas) {
          await tx.asignacionMaterialEntrega.create({
            data: {
              eventoId: created.id,
              dirigenteId: p.dirigenteId,
              descripcion: linea.descripcion,
              fotoUrl: linea.fotoUrl,
              cantidad: linea.cantidad,
            },
          });
        }
      }

      return created;
    });

    const full = await prisma.eventoEntregaMaterial.findUnique({
      where: { id: evento.id },
      include: { _count: { select: { participantes: true, entregas: true } } },
    });

    await registrarAuditoria(req, {
      accion: "CREATE",
      entidad: "EventoEntregaMaterial",
      entidadId: evento.id,
      entidadLabel: evento.titulo,
      despues: { titulo: evento.titulo, participantes: ids.length },
    });

    res.status(201).json(serializeEventoEntregaMaterial(full!));
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ error: "Datos inválidos", detalles: error.errors });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Error al crear entrega" });
  }
});

router.get("/eventos/:id", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const evento = await prisma.eventoEntregaMaterial.findUnique({
      where: { id },
      include: { _count: { select: { participantes: true, entregas: true } } },
    });
    if (!evento) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    res.json(serializeEventoEntregaMaterial(evento));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar evento" });
  }
});

router.get("/eventos/:id/pase", requireAsistenciaOrStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const evento = await prisma.eventoEntregaMaterial.findUnique({
      where: { id },
      include: { _count: { select: { participantes: true, entregas: true } } },
    });
    if (!evento) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }

    const [participantes, entregas, asignaciones] = await Promise.all([
      prisma.eventoEntregaMaterialDirigente.findMany({
        where: { eventoId: id },
        include: {
          dirigente: {
            select: {
              id: true,
              nombre: true,
              primerApellido: true,
              segundoApellido: true,
              tipo: true,
              colonia: true,
              seccionElectoral: true,
              distritoLocal: true,
              codigoQr: true,
            },
          },
        },
      }),
      prisma.registroEntregaMaterial.findMany({
        where: { eventoId: id },
        include: {
          registradoPor: { select: { id: true, username: true } },
          lineas: true,
        },
        orderBy: { registradoAt: "desc" },
      }),
      prisma.asignacionMaterialEntrega.findMany({ where: { eventoId: id } }),
    ]);

    const entregaPorDirigente = new Map(entregas.map((e) => [e.dirigenteId, e]));
    const asignacionesPorDirigente = new Map<string, typeof asignaciones>();
    for (const a of asignaciones) {
      const list = asignacionesPorDirigente.get(a.dirigenteId) ?? [];
      list.push(a);
      asignacionesPorDirigente.set(a.dirigenteId, list);
    }

    const lista = [...participantes]
      .sort((a, b) => compararDirigentePorApellidosNombre(a.dirigente, b.dirigente))
      .map((p) => {
        const d = p.dirigente;
        const entrega = entregaPorDirigente.get(d.id);
        return {
          id: d.id,
          nombreCompleto: nombreCompleto(d),
          tipo: d.tipo,
          colonia: d.colonia,
          seccionElectoral: d.seccionElectoral,
          distritoLocal: d.distritoLocal,
          distritoLabel: etiquetaDistritoLocal(d.distritoLocal),
          codigoQr: d.codigoQr,
          entregado: Boolean(entrega),
          registradoAt: entrega?.registradoAt.toISOString() ?? null,
          registradoPor: entrega?.registradoPor
            ? { id: entrega.registradoPor.id, username: entrega.registradoPor.username }
            : null,
          materialesAsignados: (asignacionesPorDirigente.get(d.id) ?? []).map((a) => ({
            descripcion: a.descripcion,
            fotoUrl: a.fotoUrl,
            cantidad: a.cantidad,
          })),
        };
      });

    const porDistrito = new Map<number | "otros", { entregados: typeof lista; pendientes: typeof lista }>();
    for (const item of lista) {
      const key =
        item.distritoLocal === 26 || item.distritoLocal === 30 ? item.distritoLocal : ("otros" as const);
      const bucket = porDistrito.get(key) ?? { entregados: [], pendientes: [] };
      if (item.entregado) bucket.entregados.push(item);
      else bucket.pendientes.push(item);
      porDistrito.set(key, bucket);
    }

    const resumenDistritos = [...porDistrito.entries()].map(([distrito, grupos]) => ({
      distrito,
      distritoLabel: typeof distrito === "number" ? etiquetaDistritoLocal(distrito) : "Otros",
      entregados: grupos.entregados.length,
      pendientes: grupos.pendientes.length,
      entregadosLista: grupos.entregados,
      pendientesLista: grupos.pendientes,
    }));

    res.json({
      evento: serializeEventoEntregaMaterial(evento),
      lista,
      resumenDistritos,
      registros: entregas.map((e) =>
        serializeRegistroEntregaMaterial({
          ...e,
          evento,
          dirigente: participantes.find((p) => p.dirigenteId === e.dirigenteId)?.dirigente ?? null,
        }),
      ),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar pase de entrega" });
  }
});

router.post("/eventos/:id/abrir", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const evento = await prisma.eventoEntregaMaterial.findUnique({ where: { id } });
    if (!evento) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    if (evento.estado === "CERRADO") {
      res.status(400).json({ error: "La entrega ya está cerrada" });
      return;
    }
    if (!vigenciaEntregaMaterialActiva(evento.fechaInicio, evento.fechaFin)) {
      res.status(400).json({ error: mensajeFueraVigencia(evento.titulo) });
      return;
    }

    const otroAbierto = await prisma.eventoEntregaMaterial.findFirst({
      where: { estado: "ABIERTO", id: { not: id } },
    });
    if (otroAbierto) {
      res.status(400).json({
        error: `Cierra primero la entrega abierta: ${otroAbierto.titulo}`,
      });
      return;
    }

    const updated = await prisma.eventoEntregaMaterial.update({
      where: { id },
      data: { estado: "ABIERTO", abiertoAt: new Date() },
      include: { _count: { select: { participantes: true, entregas: true } } },
    });

    res.json(serializeEventoEntregaMaterial(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al abrir entrega" });
  }
});

router.post("/eventos/:id/cerrar", requireStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const updated = await prisma.eventoEntregaMaterial.update({
      where: { id },
      data: { estado: "CERRADO", cerradoAt: new Date() },
      include: { _count: { select: { participantes: true, entregas: true } } },
    });

    await inhabilitarUsuariosPaseLista();

    res.json(serializeEventoEntregaMaterial(updated));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cerrar entrega" });
  }
});

router.post("/eventos/:id/registrar", requireAsistenciaOrStaff, async (req, res) => {
  try {
    const id = paramId(req.params.id);
    const resultado = await procesarEscaneoMaterial({
      raw: rawCodigoDesdeEscaneo(req),
      eventoId: id,
      registradoPorId: req.user?.sub ?? null,
      req,
    });
    res.status(resultado.status).json(cuerpoRespuestaEscaneoMaterial(resultado));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar entrega" });
  }
});

router.get("/dirigentes/:dirigenteId", async (req, res) => {
  try {
    const dirigenteId = paramId(req.params.dirigenteId);
    const { canAccessDirigentePanel } = await import("../lib/user-panel.js");
    if (!req.user || !(await canAccessDirigentePanel(req.user, dirigenteId))) {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    const registros = await prisma.registroEntregaMaterial.findMany({
      where: { dirigenteId },
      include: {
        evento: true,
        lineas: true,
        registradoPor: { select: { id: true, username: true } },
        dirigente: {
          select: {
            id: true,
            nombre: true,
            primerApellido: true,
            segundoApellido: true,
            tipo: true,
            colonia: true,
            seccionElectoral: true,
            distritoLocal: true,
          },
        },
      },
      orderBy: { registradoAt: "desc" },
    });

    res.json({
      total: registros.length,
      registros: registros.map((r) => serializeRegistroEntregaMaterial(r)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar material entregado" });
  }
});

export default router;
