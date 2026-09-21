"use client";

import { useRef, useState } from "react";
import { CameraCaptureModal } from "@/components/CameraCaptureModal";

/** Tipos comunes en galería móvil (incluye HEIC de iPhone). */
const GALLERY_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/*";

type Props = {
  onFile: (file: File) => void | Promise<void>;
  disabled?: boolean;
  multiple?: boolean;
};

/** Selector de imagen: cámara vía getUserMedia + galería (Samsung A55 / Chrome). */
export function ImageCapturePicker({ onFile, disabled = false, multiple = false }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  async function handleGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    for (const file of files) {
      await onFile(file);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <input
          ref={galleryRef}
          type="file"
          accept={GALLERY_ACCEPT}
          multiple={multiple}
          className="sr-only"
          disabled={disabled}
          onChange={handleGalleryChange}
          aria-hidden
          tabIndex={-1}
        />
        <button
          type="button"
          className="btn-secondary btn-sm btn-responsive"
          disabled={disabled}
          onClick={() => setCameraOpen(true)}
        >
          Tomar foto
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm btn-responsive"
          disabled={disabled}
          onClick={() => galleryRef.current?.click()}
        >
          Galería
        </button>
      </div>

      <CameraCaptureModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={onFile}
      />
    </>
  );
}
