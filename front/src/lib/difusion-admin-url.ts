export type DifusionAdminFiltros = {
  campanaId?: string;
  dirigenteId?: string;
  dirigenteNombre?: string;
};

export function urlDifusionAdmin(filtros: DifusionAdminFiltros): string {
  const q = new URLSearchParams();
  if (filtros.campanaId) q.set("campanaId", filtros.campanaId);
  if (filtros.dirigenteId) {
    q.set("dirigenteId", filtros.dirigenteId);
    if (filtros.dirigenteNombre) q.set("dirigenteNombre", filtros.dirigenteNombre);
  }
  const qs = q.toString();
  return qs ? `/difusion?${qs}` : "/difusion";
}
