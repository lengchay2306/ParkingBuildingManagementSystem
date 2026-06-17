import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
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
import { PLATE_VIEWFINDER } from '@/features/staff/lib/plate-scanner-viewfinder';
import { useDesignColors } from '@/hooks/use-design-colors';

const CAMERA_WARMUP_MS = 1200;

const SCAN_INTERVAL_MS = {
  native: 1500,
  cloud: 5000,
} as const;

type StaffPlateScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onPlateDetected: (plate: string) => void;
  t: (vi: string, en: string) => string;
};

function PlateScanOverlay({ accentColor }: { accentColor: string }) {
  const scanY = useSharedValue(0);
  const { marginX, marginY, width, height } = PLATE_VIEWFINDER;

  useEffect(() => {
    scanY.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scanY]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${marginY * 100 + scanY.value * height * 100}%` as `${number}%`,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[overlayStyles.dim, { top: 0, left: 0, right: 0, height: `${marginY * 100}%` }]} />
      <View
        style={[overlayStyles.dim, { bottom: 0, left: 0, right: 0, height: `${marginY * 100}%` }]}
      />
      <View
        style={[
          overlayStyles.dim,
          { top: `${marginY * 100}%`, bottom: `${marginY * 100}%`, left: 0, width: `${marginX * 100}%` },
        ]}
      />
      <View
        style={[
          overlayStyles.dim,
          { top: `${marginY * 100}%`, bottom: `${marginY * 100}%`, right: 0, width: `${marginX * 100}%` },
        ]}
      />
      <View
        style={[
          overlayStyles.frame,
          {
            left: `${marginX * 100}%`,
            width: `${width * 100}%`,
            top: `${marginY * 100}%`,
            height: `${height * 100}%`,
            borderColor: accentColor,
          },
        ]}
      />
      <Animated.View
        style={[
          overlayStyles.scanLine,
          { left: `${marginX * 100}%`, width: `${width * 100}%`, backgroundColor: accentColor },
          scanLineStyle,
        ]}
      />
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(11,15,25,0.55)',
  },
  frame: {
    position: 'absolute',
    borderRadius: Radius.lg,
    borderWidth: 2,
  },
  scanLine: {
    position: 'absolute',
    height: 2,
    opacity: 0.9,
  },
});

export function StaffPlateScannerModal({
  visible,
  onClose,
  onPlateDetected,
  t,
}: StaffPlateScannerModalProps) {
  const DesignColors = useDesignColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
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
    if (!visible) {
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
  }, [visible]);

  useEffect(() => {
    if (!visible || !isCloudOcr) {
      return;
    }

    const tick = () => {
      const remaining = getCloudOcrCooldownRemainingMs();
      setCooldownSeconds(remaining > 0 ? Math.ceil(remaining / 1000) : 0);
    };

    tick();
    const intervalId = setInterval(tick, 500);
    return () => clearInterval(intervalId);
  }, [visible, isCloudOcr, statusMessage, isProcessing]);

  useEffect(() => {
    if (!visible || !cameraReady) {
      setScanEnabled(false);
      return;
    }

    const timer = setTimeout(() => setScanEnabled(true), CAMERA_WARMUP_MS);
    return () => clearTimeout(timer);
  }, [visible, cameraReady]);

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
            t(
              `OCR bị giới hạn — ${result.message}`,
              `OCR rate limited — ${result.message}`,
            ),
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
      onClose();
    } catch {
      setStatusMessage(t('Quét thất bại — thử lại', 'Scan failed — try again'));
    } finally {
      isScanningRef.current = false;
      if (!detectedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [cameraReady, isCloudOcr, ocrAvailable, onClose, onPlateDetected, scanEnabled, t]);

  useEffect(() => {
    if (
      !visible ||
      !scanEnabled ||
      !permission?.granted ||
      !ocrAvailable ||
      manualCloudScan
    ) {
      return;
    }

    const intervalId = setInterval(() => {
      void runScanTick();
    }, scanIntervalMs);

    return () => clearInterval(intervalId);
  }, [
    visible,
    scanEnabled,
    permission?.granted,
    ocrAvailable,
    manualCloudScan,
    runScanTick,
    scanIntervalMs,
  ]);

  const handleRequestPermission = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  const renderBody = () => {
    if (!permission) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={DesignColors.accentViolet} size="large" />
        </View>
      );
    }

    if (!ocrAvailable) {
      return (
        <View style={styles.centered}>
          <Ionicons color={DesignColors.accentAmber} name="globe-outline" size={48} />
          <ThemedText style={styles.permissionTitle}>
            {t('OCR không khả dụng', 'OCR unavailable')}
          </ThemedText>
        </View>
      );
    }

    if (cameraError) {
      return (
        <View style={styles.centered}>
          <Ionicons color={DesignColors.accentAmber} name="warning-outline" size={48} />
          <ThemedText style={styles.permissionTitle}>
            {t('Không mở được camera', 'Camera failed to start')}
          </ThemedText>
          <ThemedText style={styles.permissionHint}>{cameraError}</ThemedText>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.centered}>
          <Ionicons color={DesignColors.accentViolet} name="camera-outline" size={48} />
          <ThemedText style={styles.permissionTitle}>
            {t('Cho phép camera', 'Allow camera access')}
          </ThemedText>
          <Pressable onPress={handleRequestPermission} style={styles.permissionButton}>
            <ThemedText style={styles.permissionButtonText}>
              {t('Cấp quyền', 'Grant permission')}
            </ThemedText>
          </Pressable>
        </View>
      );
    }

    return (
      <>
        <CameraView
          ref={cameraRef}
          animateShutter={false}
          facing="back"
          flash="off"
          mode="picture"
          style={StyleSheet.absoluteFill}
          onCameraReady={() => {
            setCameraError(null);
            setCameraReady(true);
          }}
          onMountError={({ message }) => {
            setCameraReady(false);
            setScanEnabled(false);
            setCameraError(message);
          }}
        />
        <PlateScanOverlay accentColor={DesignColors.accentViolet} />

        <View style={[styles.hud, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.liveBadge}>
            {!scanEnabled || isProcessing ? (
              <ActivityIndicator color={DesignColors.accentEmerald} size="small" />
            ) : (
              <View style={styles.liveDot} />
            )}
            <ThemedText style={styles.liveBadgeText}>
              {!scanEnabled
                ? t('Đang khởi động camera…', 'Starting camera…')
                : manualCloudScan
                  ? t('Expo Go · chạm để quét', 'Expo Go · tap to scan')
                  : t('Đang quét liên tục', 'Live scanning')}
            </ThemedText>
          </View>
          <ThemedText style={styles.hudHint}>
            {manualCloudScan
              ? t(
                  'OCR miễn phí giới hạn tốc độ — căn biển số rồi chạm Quét ngay',
                  'Free OCR is rate-limited — align the plate then tap Scan now',
                )
              : t(
                  'Căn biển số vào khung giữa — tự nhận diện khi thấy',
                  'Center the plate in the frame — auto-detects when found',
                )}
          </ThemedText>
          {statusMessage ? <ThemedText style={styles.hudStatus}>{statusMessage}</ThemedText> : null}
          <Pressable
            disabled={!scanEnabled || isProcessing || scanBlockedByCooldown}
            onPress={() => void runScanTick()}
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.captureButtonPressed,
              (!scanEnabled || isProcessing || scanBlockedByCooldown) && styles.captureButtonDisabled,
            ]}>
            <Ionicons color={DesignColors.onPrimary} name="scan" size={22} />
            <ThemedText style={styles.captureButtonLabel}>
              {scanBlockedByCooldown
                ? t(`Đợi ${cooldownSeconds}s`, `Wait ${cooldownSeconds}s`)
                : t('Quét ngay', 'Scan now')}
            </ThemedText>
          </Pressable>
        </View>
      </>
    );
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <View style={styles.root}>
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.xs }]}>
          <Pressable
            accessibilityLabel={t('Đóng', 'Close')}
            hitSlop={12}
            onPress={onClose}
            style={styles.closeButton}>
            <Ionicons color={DesignColors.ink} name="close" size={24} />
          </Pressable>
          <ThemedText style={styles.topTitle}>{t('Quét biển số', 'Scan license plate')}</ThemedText>
          <View style={styles.topSpacer} />
        </View>
        <View style={styles.cameraHost}>{renderBody()}</View>
      </View>
    </Modal>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: Radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.surface2,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    topTitle: {
      flex: 1,
      textAlign: 'center',
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '600',
    },
    topSpacer: {
      width: 40,
    },
    cameraHost: {
      flex: 1,
      backgroundColor: '#000',
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: Spacing.lg,
      gap: Spacing.md,
      backgroundColor: DesignColors.surface1,
    },
    permissionTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      textAlign: 'center',
    },
    permissionHint: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
      textAlign: 'center',
    },
    permissionButton: {
      marginTop: Spacing.sm,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      backgroundColor: DesignColors.accentViolet,
    },
    permissionButtonText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
      fontWeight: '600',
    },
    hud: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.md,
      backgroundColor: 'rgba(11,15,25,0.88)',
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: 'rgba(16,185,129,0.35)',
      backgroundColor: 'rgba(16,185,129,0.12)',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: DesignColors.accentEmerald,
    },
    liveBadgeText: {
      ...Typography.caption,
      color: DesignColors.accentEmerald,
      fontWeight: '600',
      fontSize: 11,
    },
    hudHint: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    hudStatus: {
      ...Typography.caption,
      color: DesignColors.accentSky,
      textAlign: 'center',
      lineHeight: 18,
    },
    captureButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
      minHeight: 44,
      backgroundColor: DesignColors.accentViolet,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    captureButtonLabel: {
      ...Typography.button,
      color: DesignColors.onPrimary,
      fontWeight: '600',
    },
    captureButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    captureButtonDisabled: {
      opacity: 0.45,
    },
  });
}
