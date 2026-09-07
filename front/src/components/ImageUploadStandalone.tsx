"use client";

import { UploadImage } from "@/components/UploadImage";
import { ImageCapturePicker } from "@/components/ImageCapturePicker";
import { useState } from "react";
import { etiquetaEstadoSubida, uploadImageFile, type UploadImageStatus } from "@/lib/upload-image";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  previewAlt?: string;
};

export function ImageUploadStandalone({
  label,
  value,
  onChange,
  previewAlt = "Imagen",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<UploadImageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    setStatus({ phase: "compress" });
    try {
      onChange(await uploadImageFile(file, setStatus));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      setStatus(null);
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-2 flex flex-wrap items-start gap-4">
        {value ? (
          <UploadImage
            src={value}
            alt={previewAlt}
            width={160}
            height={100}
            className="h-24 w-40 rounded-pin object-cover ring-2 ring-pin-light shadow-pin"
          />
        ) : (
          <div className="flex h-24 w-40 items-center justify-center rounded-pin border-2 border-dashed border-line bg-surface-muted text-xs font-medium text-ink-secondary">
            Sin imagen
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <ImageCapturePicker onFile={handleFile} disabled={uploading} />
          {value ? (
            <button
              type="button"
              className="block text-xs font-semibold text-pin hover:text-pin-hover"
              onClick={() => onChange("")}
            >
              Quitar imagen
            </button>
          ) : null}
          {uploading ? (
            <p className="text-xs text-ink-secondary">{etiquetaEstadoSubida(status) ?? "Subiendo…"}</p>
          ) : null}
          {error ? <p className="field-error">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
