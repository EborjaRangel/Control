"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
};

async function openCameraStream(): Promise<MediaStream> {
  const constraints: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    },
    { video: { facingMode: "environment" }, audio: false },
    { video: true, audio: false },
  ];

  let lastError: unknown;
  for (const constraint of constraints) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraint);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("No se pudo abrir la cámara");
}

/** Vista previa con getUserMedia (Samsung/Chrome no abren cámara con input file). */
export function CameraCaptureModal({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
  }, []);

  const handleClose = useCallback(() => {
    stopStream();
    setError(null);
    onClose();
  }, [onClose, stopStream]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setError(null);
      return;
    }

    let cancelled = false;

    async function start() {
      setError(null);
      setReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          "Este navegador no permite usar la cámara en sitios web. Abre AXIS en Chrome y usa Tomar foto, o elige Galería.",
        );
        return;
      }

      try {
        const stream = await openCameraStream();
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play();
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setError(
            "No se pudo usar la cámara. AXIS es una web app en el navegador (no aparece en Ajustes como app instalada). En Chrome: candado junto a la URL → Permisos → Cámara → Permitir. En Android: Ajustes → Aplicaciones → Chrome → Permisos → Cámara. También puedes usar Galería.",
          );
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !ready || video.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("No se pudo guardar la foto. Intenta de nuevo.");
          return;
        }
        onCapture(
          new File([blob], `foto-${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          }),
        );
        handleClose();
      },
      "image/jpeg",
      0.92,
    );
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="modal-panel max-w-lg"
        role="dialog"
        aria-labelledby="camera-capture-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 id="camera-capture-title" className="section-title">
            Tomar foto
          </h3>
          <p className="mt-1 text-sm text-ink-secondary">
            AXIS funciona en el navegador (web app). Apunta con la cámara trasera y pulsa Capturar.
            Si Chrome pide permiso, elige Permitir.
          </p>
        </div>

        <div className="overflow-hidden rounded-pin bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-[4/3] w-full object-cover"
          />
        </div>

        {error ? <div className="alert-error text-sm">{error}</div> : null}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button type="button" className="btn-ghost btn-responsive" onClick={handleClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary btn-responsive"
            disabled={!ready}
            onClick={capturePhoto}
          >
            Capturar
          </button>
        </div>
      </div>
    </div>
  );
}
