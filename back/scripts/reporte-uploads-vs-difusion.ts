/**
 * Cruza uploads del log Railway (24h) con registros de difusión en BD.
 * Uso: railway logs --service Control --since 24h --json > logs.jsonl
 *      npx tsx scripts/reporte-uploads-vs-difusion.ts logs.jsonl
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma.js";

const logPath = process.argv[2];
if (!logPath) {
  console.error("Pasa la ruta al archivo JSONL de railway logs");
  process.exit(1);
}

const uploadRe = /upload ok bytes=\d+ ms=\d+ name=([^\s]+)/;

function parseUploads(raw: string) {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const uploads: { at: string; file: string }[] = [];
  for (const line of lines) {
    try {
      const row = JSON.parse(line) as { message?: string; timestamp?: string };
      const msg = row.message ?? "";
      const m = uploadRe.exec(msg);
      if (m && row.timestamp) uploads.push({ at: row.timestamp, file: m[1] });
    } catch {
      /* skip */
    }
  }
  return uploads;
}

async function main() {
  const raw = readFileSync(logPath, "utf8");
  const uploads = parseUploads(raw);
  console.log(`Uploads OK en log (24h): ${uploads.length}`);

  if (!uploads.length) return;

  const names = [...new Set(uploads.map((u) => u.file))];
  const or = names.map((n) => ({ fotoUrl: { contains: n } }));

  const urlOr = (field: string) => names.flatMap((n) => [{ [field]: { contains: n } }]);

  const [enDifusion, enAsamblea, enDetectado, enServicio, enDirigente] = await Promise.all([
    prisma.registroDifusion.findMany({
      where: { OR: or },
      select: { id: true, fotoUrl: true, registradoAt: true },
    }),
    prisma.asambleaFoto.findMany({
      where: { OR: urlOr("url") },
      select: { id: true, url: true },
      take: 100,
    }),
    prisma.personaDetectada.findMany({
      where: { OR: [...urlOr("ineFrenteUrl"), ...urlOr("ineReversoUrl")] },
      select: { id: true, ineFrenteUrl: true, ineReversoUrl: true },
      take: 100,
    }),
    prisma.reporteServicioUrbano.findMany({
      where: {
        OR: [
          ...urlOr("fotoAntesUrl"),
          ...urlOr("fotoDespuesUrl"),
          ...urlOr("fotoAtencionUrl"),
        ],
      },
      select: { id: true, fotoAntesUrl: true, fotoDespuesUrl: true, fotoAtencionUrl: true },
      take: 100,
    }),
    prisma.dirigente.findMany({
      where: {
        OR: [...urlOr("ineFrenteUrl"), ...urlOr("ineReversoUrl"), ...urlOr("fotoUrl")],
      },
      select: { id: true, ineFrenteUrl: true, ineReversoUrl: true, fotoUrl: true },
      take: 100,
    }),
  ]);

  const markUsed = (text: string | null | undefined, usados: Set<string>) => {
    if (!text) return;
    for (const n of names) if (text.includes(n)) usados.add(n);
  };

  const usados = new Set<string>();
  for (const r of enDifusion) markUsed(r.fotoUrl, usados);
  for (const r of enAsamblea) markUsed(r.url, usados);
  for (const r of enDetectado) {
    markUsed(r.ineFrenteUrl, usados);
    markUsed(r.ineReversoUrl, usados);
  }
  for (const r of enServicio) {
    markUsed(r.fotoAntesUrl, usados);
    markUsed(r.fotoDespuesUrl, usados);
    markUsed(r.fotoAtencionUrl, usados);
  }
  for (const r of enDirigente) {
    markUsed(r.ineFrenteUrl, usados);
    markUsed(r.ineReversoUrl, usados);
    markUsed(r.fotoUrl, usados);
  }

  const huerfanos = uploads.filter((u) => !usados.has(u.file));
  const huerfanosUnicos = [...new Map(huerfanos.map((u) => [u.file, u])).values()];

  console.log(`Archivos usados en difusión (histórico): ${enDifusion.length} registro(s) coinciden`);
  console.log(
    `Uploads sin match en difusión/asamblea/detectado/servicios/dirigente (24h): ${huerfanosUnicos.length}`,
  );

  if (huerfanosUnicos.length) {
    console.log("\nPosibles fotos subidas pero sin registro guardado (últimas 15):");
    for (const u of huerfanosUnicos.slice(0, 15)) {
      console.log(`  ${u.at} | ${u.file}`);
    }
  }

  const hoyMx = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" }),
  );
  hoyMx.setHours(0, 0, 0, 0);
  const uploadsHoy = uploads.filter((u) => new Date(u.at) >= hoyMx);
  console.log(`\nUploads hoy (MX): ${uploadsHoy.length}`);
  const huerfanosHoy = huerfanosUnicos.filter((u) => new Date(u.at) >= hoyMx);
  console.log(`Huérfanos hoy (MX): ${huerfanosHoy.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
