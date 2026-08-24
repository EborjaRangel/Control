import { hidratarCasillasDesdeDb } from "./casillas-electorales.js";
import { hidratarResultadosAlcaldiaDesdeDb } from "./resultados-alcaldia-iecm.js";

export async function hidratarCatalogosElectorales() {
  const [resultados, casillas] = await Promise.all([
    hidratarResultadosAlcaldiaDesdeDb().catch((error) => {
      console.warn("No se pudieron hidratar resultados electorales desde la base:", error);
      return false;
    }),
    hidratarCasillasDesdeDb().catch((error) => {
      console.warn("No se pudo hidratar el catálogo de casillas desde la base:", error);
      return false;
    }),
  ]);
  return { resultados, casillas };
}
