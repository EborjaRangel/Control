export type CampanaDifusionDTO = {
  id: string;
  titulo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: "ACTIVA" | "CERRADA";
  estadoLabel: string;
  aceptaRegistros: boolean;
  cerradaAt: string | null;
  totalRegistros?: number;
  createdAt: string;
  updatedAt: string;
};

export type RegistroDifusionDTO = {
  id: string;
  campanaId: string;
  campanaTitulo: string | null;
  dirigenteId: string;
  dirigenteNombre: string | null;
  dirigenteTipo: string | null;
  dirigenteSeccion: string | null;
  fotoUrl: string;
  lat: number;
  lng: number;
  registradoAt: string;
};

export type DirigenteDifusionPanelDTO = {
  dirigente: {
    id: string;
    nombreCompleto: string;
    tipo: string;
    seccionElectoral: string;
    colonia: string;
    activo: boolean;
  };
  totalRegistros: number;
  campanasActivas: CampanaDifusionDTO[];
  registros: RegistroDifusionDTO[];
};

export type CampanaDifusionOpcion = { id: string; titulo: string; activa: boolean };

/** Campañas activas + campañas donde el dirigente ya tiene registros (consulta). */
export function campanasDifusionParaDirigente(panel: DirigenteDifusionPanelDTO): CampanaDifusionOpcion[] {
  const activasIds = new Set(panel.campanasActivas.map((c) => c.id));
  const map = new Map<string, CampanaDifusionOpcion>();

  for (const c of panel.campanasActivas) {
    map.set(c.id, { id: c.id, titulo: c.titulo, activa: true });
  }
  for (const r of panel.registros) {
    if (!map.has(r.campanaId)) {
      map.set(r.campanaId, {
        id: r.campanaId,
        titulo: r.campanaTitulo ?? "Campaña",
        activa: activasIds.has(r.campanaId),
      });
    }
  }

  return [...map.values()].sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));
}

export function campanaDifusionInicialDirigente(panel: DirigenteDifusionPanelDTO): string {
  const opciones = campanasDifusionParaDirigente(panel);
  if (!opciones.length) return "";

  const activasIds = new Set(panel.campanasActivas.map((c) => c.id));
  const registrosActivos = panel.registros.filter((r) => activasIds.has(r.campanaId));
  if (registrosActivos.length) {
    const ultimo = [...registrosActivos].sort(
      (a, b) => new Date(b.registradoAt).getTime() - new Date(a.registradoAt).getTime(),
    )[0];
    return ultimo.campanaId;
  }
  if (panel.campanasActivas[0]) return panel.campanasActivas[0].id;
  if (panel.registros[0]) return panel.registros[0].campanaId;
  return opciones[0].id;
}

export function formatRegistroDifusionFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  });
}
