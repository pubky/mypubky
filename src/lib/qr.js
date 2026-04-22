import encodeQR from "qr";

export function renderQrSvg(value, scale = 6) {
  if (!value) return "";
  return encodeQR(value, "svg", {
    ecc: "medium",
    scale,
    border: 2
  });
}
