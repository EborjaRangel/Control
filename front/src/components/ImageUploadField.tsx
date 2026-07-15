"use client";

import { UploadImage } from "@/components/UploadImage";
import { useFormikContext } from "formik";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Props = {
  name: string;
  label: string;
  previewAlt?: string;
};

export function ImageUploadField({ name, label, previewAlt = "Imagen" }: Props) {
  const { values, setFieldValue, errors, touched, submitCount } =
    useFormikContext<Record<string, unknown>>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = values[name] as string | null | undefined;
  const fieldError = errors[name] as string | undefined;
  const showError = Boolean(fieldError && (touched[name] || submitCount > 0));

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch("/api/upload", { method: "POST", body: formData });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Error al subir la imagen");
        return;
      }
      await setFieldValue(name, data.url ?? "");
    } catch {
      setError("No se pudo subir la imagen");
    } finally {
      setUploading(false);
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
          {uploading ? <p className="text-xs text-ink-secondary">Subiendo…</p> : null}
          {error ? <p className="field-error">{error}</p> : null}
          {showError ? <p className="field-error">{fieldError}</p> : null}
        </div>
      </div>
    </div>
  );
}
