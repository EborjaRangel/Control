import { axisOpenGraphImage } from "@/lib/axis-og";

export const alt = "AXIS";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return axisOpenGraphImage();
}
