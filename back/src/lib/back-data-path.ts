import { existsSync, readFileSync } from "fs";
import path from "path";

let cachedBackRoot: string | null = null;

function esRaizBack(dir: string): boolean {
  const pkgFile = path.join(dir, "package.json");
  if (!existsSync(pkgFile)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgFile, "utf8")) as { name?: string };
    return pkg.name === "control-back";
  } catch {
    return false;
  }
}

function tieneDatosElectoral(dir: string): boolean {
  return (
    existsSync(path.join(dir, "data/electoral/casillas-coyoacan-2024.json")) ||
    existsSync(path.join(dir, "data/electoral/resultados-alcaldia-coyoacan.json"))
  );
}

/** Raíz del paquete `back/` aunque process.cwd() sea el monorepo. */
export function resolveBackRoot(): string {
  if (cachedBackRoot) return cachedBackRoot;

  const candidates = [process.cwd(), path.join(process.cwd(), "back")];
  for (const dir of candidates) {
    if (esRaizBack(dir) && tieneDatosElectoral(dir)) {
      cachedBackRoot = dir;
      return dir;
    }
  }

  for (const dir of candidates) {
    if (esRaizBack(dir)) {
      cachedBackRoot = dir;
      return dir;
    }
  }

  cachedBackRoot = process.cwd();
  return cachedBackRoot;
}

export function resolveBackDataPath(...segments: string[]): string {
  return path.join(resolveBackRoot(), "data", ...segments);
}
