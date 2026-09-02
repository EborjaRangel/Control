const MAX_EDGE = 1600;
const TARGET_MAX_BYTES = 900_000;
const START_QUALITY = 0.82;
const MIN_QUALITY = 0.55;

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

/** Reduce fotos de celular a JPEG liviano para no saturar Vercel/Railway. */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("La foto es demasiado pesada. Toma otra con menor resolución o en JPEG.");
    }
    return file;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = START_QUALITY;
    let blob = await canvasToJpeg(canvas, quality);
    while (blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 0.09);
      blob = await canvasToJpeg(canvas, quality);
    }

    if (blob.size >= file.size && file.size <= TARGET_MAX_BYTES) {
      return file;
    }

    const name = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
