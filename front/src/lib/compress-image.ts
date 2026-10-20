const MAX_EDGE = 1600;
const TARGET_MAX_BYTES = 900_000;
const START_QUALITY = 0.82;
const MIN_QUALITY = 0.5;
const MIN_EDGE = 720;

const SERVER_OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function esHeic(file: File): boolean {
  const t = file.type.toLowerCase();
  if (t === "image/heic" || t === "image/heif") return true;
  return /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
}

async function heicAJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: START_QUALITY,
  });
  const blob = Array.isArray(result) ? result[0]! : result;
  const name = file.name.replace(/\.[^.]+$/i, "") || "foto";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo comprimir la imagen"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function cargarImagenDesdeFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

async function fuenteDecodificada(
  file: File,
): Promise<{ draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; width: number; height: number; cleanup?: () => void }> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, w, h) => {
        ctx.drawImage(bitmap, 0, 0, w, h);
      },
      cleanup: () => bitmap.close(),
    };
  } catch {
    const img = await cargarImagenDesdeFile(file);
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => {
        ctx.drawImage(img, 0, 0, w, h);
      },
    };
  }
}

async function jpegComprimidoDesdeFuente(
  source: { draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; width: number; height: number; cleanup?: () => void },
  baseName: string,
): Promise<File> {
  try {
    let maxEdge = MAX_EDGE;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 6; attempt++) {
      const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("No se pudo preparar la imagen");
      }
      source.draw(ctx, width, height);

      let quality = START_QUALITY;
      blob = await canvasToJpeg(canvas, quality);
      while (blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
        quality = Math.max(MIN_QUALITY, quality - 0.08);
        blob = await canvasToJpeg(canvas, quality);
      }

      if (blob.size <= TARGET_MAX_BYTES) break;
      maxEdge = Math.max(MIN_EDGE, Math.round(maxEdge * 0.82));
    }

    if (!blob) {
      throw new Error("No se pudo comprimir la imagen");
    }

    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    source.cleanup?.();
  }
}

/** Reduce fotos de celular a JPEG liviano antes de subir (credencial, difusión, etc.). */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") && !esHeic(file)) {
    throw new Error("El archivo debe ser una imagen");
  }

  let working = file;
  if (esHeic(working)) {
    try {
      working = await heicAJpeg(working);
    } catch {
      throw new Error(
        "No se pudo convertir la foto HEIC. Usa «Tomar foto» o elige otra imagen en JPG desde la galería.",
      );
    }
  }

  if (SERVER_OK_TYPES.has(working.type) && working.size <= TARGET_MAX_BYTES && working.type === "image/jpeg") {
    return working;
  }

  try {
    const source = await fuenteDecodificada(working);
    const baseName = working.name.replace(/\.[^.]+$/, "") || file.name.replace(/\.[^.]+$/, "") || "foto";
    return await jpegComprimidoDesdeFuente(source, baseName);
  } catch {
    if (SERVER_OK_TYPES.has(working.type) && working.size <= 4 * 1024 * 1024) {
      return working;
    }
    throw new Error(
      "La foto es demasiado pesada o no se pudo procesar. Usa «Tomar foto» o elige una imagen más pequeña (JPG).",
    );
  }
}
