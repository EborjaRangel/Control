import { getSessionToken } from "./session-token";
import { compressImageForUpload } from "./compress-image";

function uploadPostUrl(): string {
  if (typeof window === "undefined") return "/api/upload";
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!base) return "/api/upload";
  try {
    if (new URL(base).origin === window.location.origin) return "/api/upload";
    return `${base}/api/upload`;
  } catch {
    return "/api/upload";
  }
}

export type UploadImageStatus =
  | { phase: "compress" }
  | { phase: "upload"; percent: number };

export function etiquetaEstadoSubida(status: UploadImageStatus | null): string | null {
  if (!status) return null;
  if (status.phase === "compress") return "Preparando foto…";
  if (status.percent <= 0) return "Subiendo…";
  return `Subiendo ${status.percent}%`;
}

export async function uploadImageFile(
  file: File,
  onStatus?: (status: UploadImageStatus) => void,
): Promise<string> {
  onStatus?.({ phase: "compress" });
  const compressed = await compressImageForUpload(file);

  onStatus?.({ phase: "upload", percent: 0 });

  const formData = new FormData();
  formData.append("file", compressed);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadPostUrl());
    xhr.withCredentials = true;
    xhr.timeout = 55_000;

    const token = getSessionToken();
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onStatus?.({ phase: "upload", percent });
    };

    xhr.onload = () => {
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText || "{}") as { url?: string; error?: string };
      } catch {
        reject(new Error("No se pudo leer la respuesta del servidor"));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !data.url) {
        const msg = data.error ?? "Error al subir la imagen";
        if (xhr.status === 401) {
          reject(new Error("Sesión expirada. Vuelve a iniciar sesión e intenta de nuevo."));
          return;
        }
        if (msg.includes("5 MB") || msg.includes("formato")) {
          reject(
            new Error(
              "No se aceptó la imagen en el servidor. La app debería comprimirla antes; intenta «Tomar foto» o otra imagen JPG.",
            ),
          );
          return;
        }
        reject(new Error(msg));
        return;
      }
      resolve(data.url);
    };

    xhr.onerror = () => {
      reject(new Error("No se pudo subir la imagen. Revisa la conexión e intenta de nuevo."));
    };
    xhr.ontimeout = () => {
      reject(new Error("La subida tardó demasiado. Revisa la red e intenta de nuevo."));
    };

    xhr.send(formData);
  });
}
