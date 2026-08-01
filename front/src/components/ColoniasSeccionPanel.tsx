import { formatElectores, formatPorcentaje, type ColoniasSeccionInfo } from "@/lib/analisis";

function etiquetaUt(colonia: ColoniasSeccionInfo["colonias"][number]): string | null {
  if (!colonia.utClave) return null;
  return `${colonia.utClave} — ${colonia.utNombre ?? ""}`.trim();
}

export function ColoniasSeccionPanel({
  coloniasDetalle,
  coloniasFallback,
  compact = false,
}: {
  coloniasDetalle?: ColoniasSeccionInfo | null;
  coloniasFallback?: string;
  compact?: boolean;
}) {
  if (!coloniasDetalle?.colonias?.length) {
    if (coloniasFallback && coloniasFallback !== "—") {
      return <span>{coloniasFallback}</span>;
    }
    return <span className="text-ink-secondary">—</span>;
  }

  if (!coloniasDetalle.compartida) {
    const colonia = coloniasDetalle.colonias[0];
    const ut = etiquetaUt(colonia);
    return (
      <span>
        {colonia.nombre}
        {ut ? (
          <span className="text-ink-secondary">
            {" "}
            · {ut} · {formatPorcentaje(colonia.porcentajeEstimado)}
          </span>
        ) : null}
      </span>
    );
  }

  if (compact) {
    return (
      <span className="text-ink-secondary" title={coloniasDetalle.etiquetaMetodo}>
        {coloniasDetalle.etiquetaLista}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
        Sección compartida ({coloniasDetalle.colonias.length} colonias)
      </p>
      <ul className="space-y-1.5">
        {coloniasDetalle.colonias.map((colonia) => {
          const ut = etiquetaUt(colonia);
          return (
            <li
              key={colonia.nombre}
              className="rounded-pin border border-line bg-surface px-2.5 py-1.5 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-ink">{colonia.nombre}</span>
                <span className="font-semibold text-ink">
                  {formatPorcentaje(colonia.porcentajeEstimado)}
                  {colonia.electoresEstimados > 0
                    ? ` · ~${formatElectores(colonia.electoresEstimados)} electores`
                    : ""}
                </span>
              </div>
              {ut ? <p className="mt-1 text-xs text-ink-secondary">UT: {ut}</p> : null}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-ink-secondary">{coloniasDetalle.etiquetaMetodo}</p>
    </div>
  );
}

export function textoBusquedaColonias(
  coloniasDetalle?: ColoniasSeccionInfo | null,
  coloniasFallback?: string,
): string {
  if (coloniasDetalle?.colonias?.length) {
    return coloniasDetalle.colonias.map((c) => c.nombre).join(" ");
  }
  return coloniasFallback ?? "";
}
