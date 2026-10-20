/**
 * Uso: railway run npx tsx scripts/uploads-disk-usage.ts
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { uploadDirPath, uploadDiskInfo } from "../src/lib/upload-dir.js";

function folderSizeBytes(dir: string): number {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) total += folderSizeBytes(p);
    else if (entry.isFile()) total += fs.statSync(p).size;
  }
  return total;
}

async function main() {
  const dir = uploadDirPath();
  const disk = await uploadDiskInfo();
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).length : 0;
  const used = fs.existsSync(dir) ? folderSizeBytes(dir) : 0;
  console.log(
    JSON.stringify(
      {
        dir,
        archivosEnRaiz: files,
        tamanoCarpetaMb: Math.round(used / (1024 * 1024)),
        discoLibreMb: disk.freeBytes != null ? Math.round(disk.freeBytes / (1024 * 1024)) : null,
        discoTotalMb: disk.totalBytes != null ? Math.round(disk.totalBytes / (1024 * 1024)) : null,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
