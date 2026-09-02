import { axisIconImage } from "@/lib/axis-og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return axisIconImage(size.width);
}
