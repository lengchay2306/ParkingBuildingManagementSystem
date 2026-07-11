import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { extractLicensePlateFromOcrText } from "@/lib/license-plate-ocr";
import { recognizeImageWithOcrSpace } from "@/lib/ocr-space";

type StaffPlateCameraScannerProps = {
  onPlateDetected: (plate: string) => void;
  onCancel: () => void;
  /** Continuous OCR without manual capture button. */
  autoScan?: boolean;
};

const AUTO_SCAN_INTERVAL_MS = 2200;

export function StaffPlateCameraScanner({
  onPlateDetected,
  onCancel,
  autoScan = false,
}: StaffPlateCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        setCameraError(
          error instanceof Error ? error.message : "Không mở được camera. Kiểm tra quyền truy cập.",
        );
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const runOcrCapture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isProcessingRef.current) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    if (!autoScan) {
      setStatusMessage("Đang nhận diện biển số...");
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        if (!autoScan) {
          setStatusMessage("Không thể xử lý ảnh.");
        }
        return;
      }

      context.drawImage(video, 0, 0, width, height);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/jpeg", 0.92);
      });

      if (!blob) {
        if (!autoScan) {
          setStatusMessage("Không chụp được ảnh.");
        }
        return;
      }

      const ocrResult = await recognizeImageWithOcrSpace(blob);
      if (!ocrResult.ok) {
        if (!autoScan) {
          setStatusMessage(ocrResult.message);
        }
        return;
      }

      const plate = extractLicensePlateFromOcrText(ocrResult.text);
      if (!plate) {
        if (!autoScan) {
          setStatusMessage("Không nhận diện được biển số — thử lại hoặc nhập tay.");
        }
        return;
      }

      onPlateDetected(plate);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [autoScan, onPlateDetected]);

  useEffect(() => {
    if (!autoScan || cameraError) {
      return;
    }

    setStatusMessage("Đang quét tự động — đưa biển số vào khung.");

    const interval = window.setInterval(() => {
      void runOcrCapture();
    }, AUTO_SCAN_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [autoScan, cameraError, runOcrCapture]);

  if (cameraError) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        <p>{cameraError}</p>
        <Button type="button" variant="secondary" className="rounded-xl" onClick={onCancel}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-border bg-black">
        <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 m-[18%] rounded-lg border-2 border-primary/70" />
        {autoScan && isProcessing ? (
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-white">
            <LoaderCircle className="size-3.5 animate-spin" />
            Đang nhận diện...
          </div>
        ) : null}
      </div>

      {statusMessage ? (
        <p className="text-xs text-muted-foreground">{statusMessage}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          {autoScan
            ? "Camera quét liên tục — không cần bấm chụp."
            : "Đưa biển số vào khung, bấm chụp để AI đọc biển."}
        </p>
      )}

      {!autoScan ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="flex-1 rounded-xl"
            onClick={() => void runOcrCapture()}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Chụp & nhận diện"
            )}
          </Button>
          <Button type="button" variant="secondary" className="rounded-xl" onClick={onCancel}>
            <X className="size-4" />
            Hủy
          </Button>
        </div>
      ) : (
        <Button type="button" variant="secondary" className="w-full rounded-xl" onClick={onCancel}>
          <X className="size-4" />
          Dừng quét
        </Button>
      )}
    </div>
  );
}
