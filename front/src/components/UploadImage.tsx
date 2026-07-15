import Image, { type ImageProps } from "next/image";
import { resolveMediaUrl } from "@/lib/media-url";

type Props = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
};

/** Imagen subida por el usuario: misma URL en móvil y escritorio, sin optimizador de Next. */
export function UploadImage({ src, alt = "", ...rest }: Props) {
  const resolved = resolveMediaUrl(src);
  if (!resolved) return null;

  return <Image src={resolved} alt={alt} unoptimized {...rest} />;
}
