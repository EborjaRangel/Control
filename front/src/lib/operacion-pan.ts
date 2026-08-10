import {
  formatElectores,
  type AnalisisSeccionRow,
  type ColoniasSeccionInfo,
} from "@/lib/analisis";
import { COLOR_PAN, type AnioAlcaldia } from "@/lib/analisis-votacion";
import {
  getEscenarioProyeccion,
  proyectarSeccionEscenario,
  type ProyeccionSeccion2027,
} from "@/lib/proyeccion-2027";

/** Elecciones intermedias (sin presidente ni jefe de gobierno), comparables a 2027. */
export const ANIOS_OPERACION: AnioAlcaldia[] = [2015, 2021];

/** Meta de operación = 30% de la votación estimada en la sección. */
export const META_OPERACION_FRACCION = 0.3;

export const META_OPERACION_PCT = META_OPERACION_FRACCION * 100;

export type OperacionSeccionRow = {
  seccion: string;
  dirigentes: string;
  colonias: string;
  coloniasDetalle: ColoniasSeccionInfo;
  unidadesTerritoriales: string;
  distritoLocal: number | null;
  votacionEstimada: number;
  votosPanProyectados: number;
  porcentajePanProyectado: number;
  metaOperacionVotos: number;
  faltanteVotos: number;
};

export type OperacionPanResumen = {
  secciones: number;
  votacionEstimadaTotal: number;
  votosPanProyectadosTotal: number;
  metaOperacionTotal: number;
  faltanteTotal: number;
  porcentajePanAgregado: number;
  porcentajeMetaAgregado: number;
};

export type OperacionPanResultado = {
  filas: OperacionSeccionRow[];
  resumen: OperacionPanResumen;
};

export function etiquetaUtsSeccion(fila: AnalisisSeccionRow): string {
  const uts = new Set<string>();
  for (const colonia of fila.coloniasDetalle.colonias) {
    if (!colonia.utClave) continue;
    const nombre = colonia.utNombre?.trim();
    uts.add(nombre ? `${colonia.utClave} — ${nombre}` : colonia.utClave);
  }
  if (uts.size) {
    return [...uts].sort((a, b) => a.localeCompare(b, "es")).join(", ");
  }
  const catalogo = fila.unidadesTerritoriales.trim();
  return catalogo && catalogo !== "—" ? catalogo : "—";
}

function filaDesdeProyeccion(proy: ProyeccionSeccion2027, fila: AnalisisSeccionRow): OperacionSeccionRow {
  const pan = proy.proyeccion2027.find((b) => b.id === "PAN");
  const votosPan = pan?.votos ?? 0;
  const pctPan = pan?.porcentaje ?? 0;
  const metaOperacionVotos = Math.round(proy.votacionEstimada2027 * META_OPERACION_FRACCION);
  const faltanteVotos = Math.max(0, metaOperacionVotos - votosPan);

  return {
    seccion: proy.seccion,
    dirigentes: fila.dirigentes,
    colonias: proy.colonias,
    coloniasDetalle: proy.coloniasDetalle,
    unidadesTerritoriales: etiquetaUtsSeccion(fila),
    distritoLocal: proy.distritoLocal,
    votacionEstimada: proy.votacionEstimada2027,
    votosPanProyectados: votosPan,
    porcentajePanProyectado: pctPan,
    metaOperacionVotos,
    faltanteVotos,
  };
}

export function calcularOperacionPan(filas: AnalisisSeccionRow[]): OperacionPanResultado {
  const escenario = getEscenarioProyeccion("partidos_solos");

  const operacion = filas
    .map((fila) => {
      const proy = proyectarSeccionEscenario(fila, escenario, { aniosRegresion: ANIOS_OPERACION });
      if (!proy) return null;
      return filaDesdeProyeccion(proy, fila);
    })
    .filter((f): f is OperacionSeccionRow => f != null)
    .sort(
      (a, b) =>
        b.faltanteVotos - a.faltanteVotos ||
        b.metaOperacionVotos - a.metaOperacionVotos ||
        Number(a.seccion) - Number(b.seccion),
    );

  let votacionEstimadaTotal = 0;
  let votosPanProyectadosTotal = 0;
  let metaOperacionTotal = 0;
  let faltanteTotal = 0;

  for (const fila of operacion) {
    votacionEstimadaTotal += fila.votacionEstimada;
    votosPanProyectadosTotal += fila.votosPanProyectados;
    metaOperacionTotal += fila.metaOperacionVotos;
    faltanteTotal += fila.faltanteVotos;
  }

  return {
    filas: operacion,
    resumen: {
      secciones: operacion.length,
      votacionEstimadaTotal,
      votosPanProyectadosTotal,
      metaOperacionTotal,
      faltanteTotal,
      porcentajePanAgregado:
        votacionEstimadaTotal > 0
          ? Math.round((votosPanProyectadosTotal / votacionEstimadaTotal) * 10000) / 100
          : 0,
      porcentajeMetaAgregado: META_OPERACION_PCT,
    },
  };
}

export function colorPanOperacion(): string {
  return COLOR_PAN;
}

export function formatVotos(n: number): string {
  return formatElectores(n);
}

export function formatResumenOperacion(resumen: OperacionPanResumen): string {
  return (
    `Proyección OLS ${ANIOS_OPERACION.join("–")} (elecciones intermedias) en ${resumen.secciones} secciones. ` +
    `Meta de operación (${META_OPERACION_PCT}% de la votación estimada): ${formatVotos(resumen.metaOperacionTotal)} votos. ` +
    `PAN proyectado: ${formatVotos(resumen.votosPanProyectadosTotal)} (${resumen.porcentajePanAgregado.toFixed(1)}%). ` +
    `Faltante para la meta: ${formatVotos(resumen.faltanteTotal)}.`
  );
}
