import { axisIconImage } from "@/lib/axis-og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return axisIconImage(size.width);
}
