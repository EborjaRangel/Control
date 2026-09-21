"use client";

import { useEffect, useRef, useState } from "react";
import { useFormikContext } from "formik";
import { ImageCapturePicker } from "@/components/ImageCapturePicker";
import { UploadImage } from "@/components/UploadImage";
import { etiquetaEstadoSubida, uploadImageFile, type UploadImageStatus } from "@/lib/upload-image";
import {
  MAX_IMAGENES_NOTIFICACION,
  type NotificacionFormValues,
} from "@/lib/validation-notificacion";

type FormStatus = { uploadingImages?: boolean };

export function NotificacionImagenesField() {
  const { values, setFieldValue, setStatus, status } = useFormikContext<NotificacionFormValues>();
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadImageStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imagenesRef = useRef(values.imagenesUrl);

  useEffect(() => {
    imagenesRef.current = values.imagenesUrl;
  }, [values.imagenesUrl]);

  const imagenes = values.imagenesUrl;
  const lleno = imagenes.length >= MAX_IMAGENES_NOTIFICACION;

  async function handleFile(file: File) {
    if (imagenesRef.current.length >= MAX_IMAGENES_NOTIFICACION) return;
    setUploading(true);
    setStatus({ ...(status as FormStatus | undefined), uploadingImages: true });
    setError(null);
    try {
      const url = await uploadImageFile(file, setUploadStatus);
      const actuales = imagenesRef.current;
      if (actuales.length >= MAX_IMAGENES_NOTIFICACION || actuales.includes(url)) {
        return;
      }
      const next = [...actuales, url];
      imagenesRef.current = next;
      await setFieldValue("imagenesUrl", next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
      setUploadStatus(null);
      setStatus({ ...(status as FormStatus | undefined), uploadingImages: false });
    }
  }

  function quitar(url: string) {
    const next = imagenesRef.current.filter((item) => item !== url);
    imagenesRef.current = next;
    void setFieldValue("imagenesUrl", next);
  }

  return (
    <div>
      <span className="label">Imágenes (opcional)</span>
      <p className="-mt-1 mb-2 text-xs text-ink-secondary">
        Adjunta fotos desde archivo o cámara. Llegan en el mensaje de cada destinatario.
        Máximo {MAX_IMAGENES_NOTIFICACION}.
      </p>
      {imagenes.length > 0 ? (
        <ul className="notif-imagenes-editor">
          {imagenes.map((url) => (
            <li key={url} className="notif-imagen-editor-item">
              <UploadImage
                src={url}
                alt="Imagen adjunta"
                width={160}
                height={120}
                className="notif-imagen-thumb"
              />
              <button
                type="button"
                className="text-xs font-semibold text-pin hover:text-pin-hover"
                onClick={() => quitar(url)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ImageCapturePicker
        onFile={handleFile}
        disabled={uploading || lleno}
        multiple
      />
      {uploading ? (
        <p className="mt-2 text-xs text-ink-secondary">
          {etiquetaEstadoSubida(uploadStatus) ?? "Subiendo…"}
        </p>
      ) : null}
      {lleno ? (
        <p className="mt-2 text-xs text-ink-secondary">
          Ya adjuntaste {MAX_IMAGENES_NOTIFICACION} imágenes.
        </p>
      ) : null}
      {error ? <p className="field-error mt-2">{error}</p> : null}
    </div>
  );
}
