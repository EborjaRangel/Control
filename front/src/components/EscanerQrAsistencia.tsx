"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onScan: (texto: string) => Promise<void>;
  disabled?: boolean;
  feedback?: { texto: string; tipo: "ok" | "aviso" | "error" } | null;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

async function openCameraStream(): Promise<MediaStream> {
  const constraints: MediaStreamConstraints[] = [
    {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
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

function crearDetector(): BarcodeDetectorLike | null {
  const Detector = (window as Window & {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }).BarcodeDetector;
  if (!Detector) return null;
  try {
    return new Detector({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

export function EscanerQrAsistencia({ onScan, disabled, feedback }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const lastValueRef = useRef<string>("");
  const lastAtRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [soportado, setSoportado] = useState(true);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setReady(false);
  }, []);

  useEffect(() => {
    if (disabled) {
      stopStream();
      return;
    }

    let cancelled = false;
    const detector = crearDetector();
    if (!detector) {
      setSoportado(false);
      setError(null);
      return;
    }

    setSoportado(true);

    async function start() {
      setError(null);
      setReady(false);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador no permite usar la cámara. Escanea el QR con la cámara nativa del teléfono.");
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
            "No se pudo usar la cámara. Permite el acceso o escanea el QR con la cámara nativa del teléfono.",
          );
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [disabled, stopStream]);

  useEffect(() => {
    if (!ready || disabled) return;
    const detector = crearDetector();
    const video = videoRef.current;
    if (!detector || !video) return;
    const qrDetector = detector;

    let active = true;

    async function tick() {
      if (!active || !video || video.readyState < 2) {
        if (active) requestAnimationFrame(() => void tick());
        return;
      }

      try {
        const barcodes = await qrDetector.detect(video);
        const raw = barcodes[0]?.rawValue?.trim();
        const now = Date.now();
        if (
          raw &&
          !scanningRef.current &&
          (raw !== lastValueRef.current || now - lastAtRef.current > 3500)
        ) {
          scanningRef.current = true;
          lastValueRef.current = raw;
          lastAtRef.current = now;
          try {
            await onScan(raw);
          } finally {
            scanningRef.current = false;
          }
        }
      } catch {
        /* el siguiente frame reintenta */
      }

      if (active) requestAnimationFrame(() => void tick());
    }

    const id = requestAnimationFrame(() => void tick());
    return () => {
      active = false;
      cancelAnimationFrame(id);
    };
  }, [ready, disabled, onScan]);

  if (!soportado) {
    return (
      <p className="text-sm text-ink-secondary">
        Apunta la cámara nativa de cualquier teléfono al QR del dirigente. El teléfono abrirá el
        resultado de la lectura.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-pin bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="aspect-[4/3] w-full object-cover"
        />
        {feedback?.texto ? (
          <div
            className={
              feedback.tipo === "ok"
                ? "absolute inset-x-3 bottom-3 rounded-pin bg-emerald-700/95 px-3 py-3 text-center text-base font-semibold text-white"
                : feedback.tipo === "aviso"
                  ? "absolute inset-x-3 bottom-3 rounded-pin bg-amber-600/95 px-3 py-3 text-center text-base font-semibold text-white"
                  : "absolute inset-x-3 bottom-3 rounded-pin bg-red-700/95 px-3 py-3 text-center text-base font-semibold text-white"
            }
          >
            {feedback.texto}
          </div>
        ) : null}
      </div>
      {error ? <div className="alert-error text-sm">{error}</div> : null}
      {!error && !ready ? (
        <p className="text-sm text-ink-secondary">Abriendo cámara…</p>
      ) : null}
    </div>
  );
}
