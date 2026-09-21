"use client";

import { UploadImage } from "@/components/UploadImage";
import { resolveMediaUrl } from "@/lib/media-url";

type Props = {
  imagenesUrl: string[] | null | undefined;
  compact?: boolean;
};

export function NotificacionImagenes({ imagenesUrl, compact = false }: Props) {
  const urls = (imagenesUrl ?? []).filter((url) => Boolean(resolveMediaUrl(url)));
  if (urls.length === 0) return null;

  return (
    <div className={compact ? "notif-imagenes-compact" : "notif-imagenes"}>
      {urls.map((url) => {
        const href = resolveMediaUrl(url) ?? url;
        return (
          <a
            key={url}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="notif-imagen-link"
          >
            <UploadImage
              src={url}
              alt="Imagen de la notificación"
              width={compact ? 96 : 720}
              height={compact ? 96 : 480}
              className={compact ? "notif-imagen-thumb" : "notif-imagen"}
            />
          </a>
        );
      })}
    </div>
  );
}
