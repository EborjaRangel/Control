import { getSessionToken } from "./session-token";
import { compressImageForUpload } from "./compress-image";

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
    xhr.open("POST", "/api/upload");
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
        reject(new Error(data.error ?? "Error al subir la imagen"));
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
