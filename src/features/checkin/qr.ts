import "server-only";
import QRCode from "qrcode";

const QR_OPTIONS = { errorCorrectionLevel: "M", margin: 2, width: 512 } as const;

export function qrPngDataUrl(text: string) {
  return QRCode.toDataURL(text, QR_OPTIONS);
}

export function qrPngBuffer(text: string) {
  return QRCode.toBuffer(text, { ...QR_OPTIONS, type: "png", width: 1024 });
}
