import fs from "fs";
import path from "path";

export function uploadDirPath(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured) return path.resolve(configured);
  return path.join(process.cwd(), "uploads");
}

export function ensureUploadDir(): string {
  const dir = uploadDirPath();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
