import { hidratarCasillasDesdeDb } from "./casillas-electorales.js";
import { hidratarResultadosAlcaldiaDesdeDb } from "./resultados-alcaldia-iecm.js";

export async function hidratarCatalogosElectorales() {
  const resultados = await hidratarResultadosAlcaldiaDesdeDb().catch((error) => {
    console.warn("No se pudieron hidratar resultados electorales desde la base:", error);
    return false;
  });
  const casillas = await hidratarCasillasDesdeDb().catch((error) => {
    console.warn("No se pudo hidratar el catálogo de casillas desde la base:", error);
    return false;
  });
  return { resultados, casillas };
}
