import { useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CameraView } from 'expo-camera';

import { cropImageToViewfinder } from '@/features/staff/lib/crop-plate-image';
import { extractLicensePlateFromOcrText } from '@/features/staff/lib/license-plate-ocr';
import {
  canRunCloudOcrNow,
  getCloudOcrCooldownRemainingMs,
  getOcrMode,
  isCloudOcrManualOnly,
  isOcrReady,
  recognizePlateText,
} from '@/features/staff/lib/ocr-runtime';

const CAMERA_WARMUP_MS = 1200;

const SCAN_INTERVAL_MS = {
  native: 1500,
  cloud: 5000,
} as const;

type UsePlateScannerOptions = {
  active: boolean;
  onPlateDetected: (plate: string) => void;
  t: (vi: string, en: string) => string;
};

export function usePlateScanner({ active, onPlateDetected, t }: UsePlateScannerOptions) {
  const cameraRef = useRef<CameraView>(null);
  const isScanningRef = useRef(false);
  const detectedRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);

  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [scanEnabled, setScanEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const ocrMode = getOcrMode();
  const ocrAvailable = isOcrReady();
  const isCloudOcr = ocrMode === 'cloud';
  const manualCloudScan = isCloudOcrManualOnly();
  const scanIntervalMs = isCloudOcr ? SCAN_INTERVAL_MS.cloud : SCAN_INTERVAL_MS.native;
  const scanBlockedByCooldown = isCloudOcr && cooldownSeconds > 0;

  useEffect(() => {
    if (!active) {
      setCameraReady(false);
      setScanEnabled(false);
      setIsProcessing(false);
      setStatusMessage(null);
      setCameraError(null);
      isScanningRef.current = false;
      detectedRef.current = false;
      consecutiveFailuresRef.current = 0;
      setCooldownSeconds(0);
    }
  }, [active]);

  useEffect(() => {
    if (!active || !isCloudOcr) {
      return;
    }

    const tick = () => {
      const remaining = getCloudOcrCooldownRemainingMs();
      setCooldownSeconds(remaining > 0 ? Math.ceil(remaining / 1000) : 0);
    };

    tick();
    const intervalId = setInterval(tick, 500);
    return () => clearInterval(intervalId);
  }, [active, isCloudOcr, statusMessage, isProcessing]);

  useEffect(() => {
    if (!active || !cameraReady) {
      setScanEnabled(false);
      return;
    }

    const timer = setTimeout(() => setScanEnabled(true), CAMERA_WARMUP_MS);
    return () => clearTimeout(timer);
  }, [active, cameraReady]);

  const runScanTick = useCallback(async () => {
    if (
      !cameraRef.current ||
      !cameraReady ||
      !scanEnabled ||
      isScanningRef.current ||
      detectedRef.current ||
      !ocrAvailable
    ) {
      return;
    }

    if (isCloudOcr && !canRunCloudOcrNow()) {
      const waitSec = Math.ceil(getCloudOcrCooldownRemainingMs() / 1000);
      setStatusMessage(
        waitSec > 0
          ? t(`Giới hạn OCR — đợi ${waitSec}s`, `OCR limit — wait ${waitSec}s`)
          : t('Giới hạn OCR — thử lại sau vài giây', 'OCR limit — try again in a few seconds'),
      );
      return;
    }

    isScanningRef.current = true;
    setIsProcessing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.65,
        skipProcessing: false,
        shutterSound: false,
      });

      if (!photo?.uri) {
        setStatusMessage(t('Không chụp được khung hình', 'Could not capture frame'));
        return;
      }

      const ocrUri = await cropImageToViewfinder(
        photo.uri,
        photo.width ?? 0,
        photo.height ?? 0,
      );

      const result = await recognizePlateText(ocrUri);
      if (!result.ok) {
        consecutiveFailuresRef.current += 1;
        if (result.code === 'rate_limited') {
          setStatusMessage(
            t(`OCR bị giới hạn — ${result.message}`, `OCR rate limited — ${result.message}`),
          );
        } else if (result.code === 'network' || result.code === 'api_error') {
          setStatusMessage(
            isCloudOcr
              ? t(`OCR lỗi: ${result.message}`, `OCR error: ${result.message}`)
              : t('Lỗi nhận diện — thử lại', 'Recognition error — try again'),
          );
        } else if (consecutiveFailuresRef.current > 2) {
          setStatusMessage(t('Đang tìm biển số trong khung…', 'Looking for plate in frame…'));
        }
        return;
      }

      consecutiveFailuresRef.current = 0;
      const plate = extractLicensePlateFromOcrText(result.text);
      if (!plate) {
        setStatusMessage(t('Chưa thấy biển số hợp lệ trong khung', 'No valid plate in frame yet'));
        return;
      }

      detectedRef.current = true;
      onPlateDetected(plate);
    } catch {
      setStatusMessage(t('Quét thất bại — thử lại', 'Scan failed — try again'));
    } finally {
      isScanningRef.current = false;
      if (!detectedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [cameraReady, isCloudOcr, ocrAvailable, onPlateDetected, scanEnabled, t]);

  useEffect(() => {
    if (!active || !scanEnabled || !permission?.granted || !ocrAvailable || manualCloudScan) {
      return;
    }

    const intervalId = setInterval(() => {
      void runScanTick();
    }, scanIntervalMs);

    return () => clearInterval(intervalId);
  }, [
    active,
    scanEnabled,
    permission?.granted,
    ocrAvailable,
    manualCloudScan,
    runScanTick,
    scanIntervalMs,
  ]);

  const requestCameraPermission = useCallback(async () => {
    if (permission?.granted) {
      return true;
    }
    const result = await requestPermission();
    return result.granted;
  }, [permission?.granted, requestPermission]);

  return {
    cameraRef,
    permission,
    requestCameraPermission,
    cameraReady,
    setCameraReady,
    scanEnabled,
    isProcessing,
    statusMessage,
    cameraError,
    setCameraError,
    ocrAvailable,
    manualCloudScan,
    scanBlockedByCooldown,
    cooldownSeconds,
    runScanTick,
  };
}
