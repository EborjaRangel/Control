"use client";

import { UploadImage } from "@/components/UploadImage";
import { useFormikContext } from "formik";
import { useState } from "react";
import { etiquetaEstadoSubida, uploadImageFile, type UploadImageStatus } from "@/lib/upload-image";

type Props = {
  name: string;
  label: string;
  previewAlt?: string;
};

export function ImageUploadField({ name, label, previewAlt = "Imagen" }: Props) {
  const { values, setFieldValue, errors, touched, submitCount } =
    useFormikContext<Record<string, unknown>>();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<UploadImageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const url = values[name] as string | null | undefined;
  const fieldError = errors[name] as string | undefined;
  const showError = Boolean(fieldError && (touched[name] || submitCount > 0));

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setStatus({ phase: "compress" });
    try {
      const uploadedUrl = await uploadImageFile(file, setStatus);
      await setFieldValue(name, uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      setStatus(null);
      e.target.value = "";
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="mt-2 flex flex-wrap items-start gap-4">
        {url ? (
          <UploadImage
            src={url}
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
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFile}
            disabled={uploading}
            className="text-sm text-ink-secondary file:mr-3 file:rounded-full file:border-0 file:bg-pin-light file:px-4 file:py-2 file:text-xs file:font-semibold file:text-pin-dark hover:file:bg-pin-muted"
          />
          {url ? (
            <button
              type="button"
              className="block text-xs font-semibold text-pin hover:text-pin-hover"
              onClick={() => void setFieldValue(name, "")}
            >
              Quitar imagen
            </button>
          ) : null}
          {uploading ? (
            <p className="text-xs text-ink-secondary">{etiquetaEstadoSubida(status) ?? "Subiendo…"}</p>
          ) : null}
          {error ? <p className="field-error">{error}</p> : null}
          {showError ? <p className="field-error">{fieldError}</p> : null}
        </div>
      </div>
    </div>
  );
}
