import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

/** Renders a QR code to an image (dark-on-light for scannability on the dark UI). */
export default function QRCode({ value, size = 180, className }: QRCodeProps) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    QRCodeLib.toDataURL(value, {
      width: size * 2, // retina
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#02070d", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        /* value too long or unavailable */
      });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className={`animate-pulse rounded-lg bg-navy/40 ${className ?? ""}`}
        style={{ width: size, height: size }}
        aria-label="Generating QR code"
      />
    );
  }
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="QR code"
      className={`rounded-lg ${className ?? ""}`}
    />
  );
}
