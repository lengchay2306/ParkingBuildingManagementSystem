import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { cn } from "@/lib/utils";

type VietQrImageProps = {
  /** Raw VietQR payload from BE `data.qrCode`. */
  qrCode: string;
  size?: number;
  className?: string;
  alt?: string;
};

/**
 * Renders the PayOS/BE `qrCode` string as a scannable image.
 * If BE already returns an image/data URL, use it directly.
 */
export function VietQrImage({
  qrCode,
  size = 280,
  className,
  alt = "Mã VietQR thanh toán",
}: VietQrImageProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(() =>
    isDirectImageSource(qrCode) ? qrCode : null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (isDirectImageSource(qrCode)) {
      setDataUrl(qrCode);
      setError(null);
      return;
    }

    setDataUrl(null);
    setError(null);

    void QRCode.toDataURL(qrCode, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không thể tạo ảnh QR từ mã BE trả về.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [qrCode, size]);

  if (error) {
    return <p className="text-center text-sm text-destructive">{error}</p>;
  }

  if (!dataUrl) {
    return (
      <div
        className={cn("animate-pulse rounded-lg bg-secondary", className)}
        style={{ width: size, height: size }}
        aria-label="Đang tạo mã QR"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-lg bg-white p-2", className)}
    />
  );
}

function isDirectImageSource(value: string) {
  return /^(https?:\/\/|data:image\/)/i.test(value.trim());
}
