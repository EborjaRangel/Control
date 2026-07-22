import { Router } from "express";
import { analisisSeccionesElectorales } from "../lib/analisis-secciones.js";
import { requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/secciones", requireAdmin, async (_req, res) => {
  try {
    const data = await analisisSeccionesElectorales();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cargar análisis de secciones" });
  }
});

export default router;
