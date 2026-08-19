export type UnidadTerritorialResumen = {
  id: string;
  clave: string;
  nombre: string;
  tipoUt: string | null;
  seccionesElectorales?: string[];
};

export function etiquetaUnidadTerritorial(ut: UnidadTerritorialResumen) {
  const base = `${ut.clave} — ${ut.nombre}`;
  const secciones = ut.seccionesElectorales?.filter(Boolean) ?? [];
  if (!secciones.length) return base;
  return `${base} · sec ${secciones.join(", ")}`;
}
