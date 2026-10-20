import fs from "fs";
import path from "path";

/** Ruta alineada al volumen Railway (`/app/uploads`); evita llenar el disco efímero de `/app/back/uploads`. */
export function uploadDirPath(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) return path.resolve(configured);
  if (process.env.RAILWAY_ENVIRONMENT) {
    return "/app/uploads";
  }
  return path.join(process.cwd(), "uploads");
}

export function ensureUploadDir(): string {
  const dir = uploadDirPath();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export type UploadDiskInfo = {
  dir: string;
  freeBytes: number | null;
  totalBytes: number | null;
  lowSpace: boolean;
};

export async function uploadDiskInfo(): Promise<UploadDiskInfo> {
  const dir = uploadDirPath();
  try {
    const { statfs } = await import("fs/promises");
    const s = await statfs(dir);
    const freeBytes = s.bfree * s.bsize;
    const totalBytes = s.blocks * s.bsize;
    const lowSpace = freeBytes < 50 * 1024 * 1024;
    return { dir, freeBytes, totalBytes, lowSpace };
  } catch {
    return { dir, freeBytes: null, totalBytes: null, lowSpace: false };
  }
}

export function mensajeErrorEspacioUpload(err: unknown): string | null {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as NodeJS.ErrnoException).code)
      : "";
  const msg = err instanceof Error ? err.message : "";
  if (code === "ENOSPC" || msg.includes("ENOSPC") || msg.includes("no space left")) {
    return "El servidor no tiene espacio para guardar fotos. El administrador debe ampliar el volumen de Railway en /app/uploads o liberar espacio.";
  }
  return null;
}
