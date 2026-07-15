export type UnidadTerritorialResumen = {
  id: string;
  clave: string;
  nombre: string;
  tipoUt: string | null;
};

export function etiquetaUnidadTerritorial(ut: UnidadTerritorialResumen) {
  return `${ut.clave} — ${ut.nombre}`;
}
