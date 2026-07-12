import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import {
  PLATE_VIEWFINDER,
  getPlateViewfinderFrameBottom,
  getPlateViewfinderMarginTop,
  getPlateViewfinderScanBandBottom,
} from '@/features/staff/lib/plate-scanner-viewfinder';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { useThemePreference } from '@/hooks/theme-preference';

const CAMERA_WARMUP_MS = 1200;

const SCAN_INTERVAL_MS = {
  native: 1500,
  cloud: 5000,
} as const;

const CORNER_SIZE = 26;
const CORNER_STROKE = 3;
const APP_BRAND_NAME = 'PARKOS';

type StaffPlateScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onPlateDetected: (plate: string) => void;
  t: (vi: string, en: string) => string;
  /** Render inline (full screen) instead of a React Native Modal. */
  embedded?: boolean;
  showCloseButton?: boolean;
  /** Extra bottom inset — e.g. when the tab bar stays visible. */
  bottomInsetExtra?: number;
  title?: string;
  footer?: ReactNode;
};

function ViewfinderCorners({
  accentColor,
  marginX,
  marginY,
  width,
  height,
}: {
  accentColor: string;
  marginX: number;
  marginY: number;
  width: number;
  height: number;
}) {
  const frameStyle = {
    left: `${marginX * 100}%` as `${number}%`,
    top: `${marginY * 100}%` as `${number}%`,
    width: `${width * 100}%` as `${number}%`,
    height: `${height * 100}%` as `${number}%`,
  };

  const cornerBase = {
    position: 'absolute' as const,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: accentColor,
  };

  return (
    <View pointerEvents="none" style={[overlayStyles.frameHost, frameStyle]}>
      <View
        style={[
          cornerBase,
          { top: 0, left: 0, borderTopWidth: CORNER_STROKE, borderLeftWidth: CORNER_STROKE, borderTopLeftRadius: 10 },
        ]}
      />
      <View
        style={[
          cornerBase,
          { top: 0, right: 0, borderTopWidth: CORNER_STROKE, borderRightWidth: CORNER_STROKE, borderTopRightRadius: 10 },
        ]}
      />
      <View
        style={[
          cornerBase,
          { bottom: 0, left: 0, borderBottomWidth: CORNER_STROKE, borderLeftWidth: CORNER_STROKE, borderBottomLeftRadius: 10 },
        ]}
      />
      <View
        style={[
          cornerBase,
          {
            bottom: 0,
            right: 0,
            borderBottomWidth: CORNER_STROKE,
            borderRightWidth: CORNER_STROKE,
            borderBottomRightRadius: 10,
          },
        ]}
      />
    </View>
  );
}

function PlateScanOverlay({
  accentColor,
  dimColor,
  dimSoftColor,
}: {
  accentColor: string;
  dimColor: string;
  dimSoftColor: string;
}) {
  const scanY = useSharedValue(0);
  const { marginX, width, height } = PLATE_VIEWFINDER;
  const marginTop = getPlateViewfinderMarginTop();
  const frameBottom = getPlateViewfinderFrameBottom();
  const scanBandBottom = getPlateViewfinderScanBandBottom();

  useEffect(() => {
    scanY.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scanY]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${marginTop * 100 + scanY.value * height * 100}%` as `${number}%`,
    opacity: 0.35 + scanY.value * 0.25,
  }));

  const gapBandHeight = Math.max(scanBandBottom - frameBottom, 0);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          overlayStyles.dim,
          { top: 0, left: 0, right: 0, height: `${marginTop * 100}%`, backgroundColor: dimColor },
        ]}
      />
      {gapBandHeight > 0 ? (
        <View
          style={[
            overlayStyles.dimSoft,
            {
              top: `${frameBottom * 100}%`,
              left: 0,
              right: 0,
              height: `${gapBandHeight * 100}%`,
              backgroundColor: dimSoftColor,
            },
          ]}
        />
      ) : null}
      <View
        style={[
          overlayStyles.dim,
          {
            top: `${marginTop * 100}%`,
            bottom: `${(1 - scanBandBottom) * 100}%`,
            left: 0,
            width: `${marginX * 100}%`,
            backgroundColor: dimColor,
          },
        ]}
      />
      <View
        style={[
          overlayStyles.dim,
          {
            top: `${marginTop * 100}%`,
            bottom: `${(1 - scanBandBottom) * 100}%`,
            right: 0,
            width: `${marginX * 100}%`,
            backgroundColor: dimColor,
          },
        ]}
      />
      {/* Light/dark chrome under HUD + tab cutout — stops raw camera black leaking through. */}
      <View
        style={[
          overlayStyles.dim,
          {
            top: `${scanBandBottom * 100}%`,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: dimColor,
          },
        ]}
      />
      <ViewfinderCorners
        accentColor={accentColor}
        height={height}
        marginX={marginX}
        marginY={marginTop}
        width={width}
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
  },
  dimSoft: {
    position: 'absolute',
  },
  frameHost: {
    position: 'absolute',
  },
  scanLine: {
    position: 'absolute',
    height: 1.5,
    borderRadius: 1,
  },
});

export function StaffPlateScannerModal({
  visible,
  onClose,
  onPlateDetected,
  t,
  embedded = false,
  showCloseButton = true,
  bottomInsetExtra = 0,
  title,
  footer,
}: StaffPlateScannerModalProps) {
  const DesignColors = useStaffDesignColors();
  const { resolvedScheme } = useThemePreference();
  const insets = useSafeAreaInsets();
  const isDark = resolvedScheme === 'dark';
  const styles = useMemo(
    () => createStyles(DesignColors, isDark),
    [DesignColors, isDark],
  );
  // Match page + tab bar canvas so the MoMo cutout has no color seam.
  const overlayDim = isDark ? 'rgba(0,0,0,0.72)' : 'rgba(228,232,240,0.92)';
  const overlayDimSoft = isDark ? 'rgba(0,0,0,0.28)' : 'rgba(228,232,240,0.55)';
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

  const topBarTitle = title ?? t('Quét biển số', 'Scan license plate');
  const hudBottomPadding = bottomInsetExtra;

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
          style={styles.cameraFeed}
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
        <PlateScanOverlay
          accentColor={DesignColors.primaryFocus}
          dimColor={overlayDim}
          dimSoftColor={overlayDimSoft}
        />

        <ThemedText
          pointerEvents="none"
          style={[
            styles.frameHint,
            {
              top: `${(getPlateViewfinderFrameBottom() + 0.012) * 100}%` as `${number}%`,
            },
          ]}>
          {t('Đặt biển số vào khung', 'Align plate inside frame')}
        </ThemedText>

        <View style={[styles.hud, { paddingBottom: hudBottomPadding }]}>
          <View style={styles.hudCard}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Ionicons color={DesignColors.primaryFocus} name="car-sport-outline" size={18} />
              </View>
              <View style={styles.brandCopy}>
                <ThemedText style={styles.brandName}>{APP_BRAND_NAME}</ThemedText>
                <ThemedText style={styles.brandTagline}>
                  {t('Hệ thống quản lý bãi xe', 'Parking management system')}
                </ThemedText>
              </View>
              {!scanEnabled || isProcessing ? (
                <ActivityIndicator color={DesignColors.primaryFocus} size="small" />
              ) : null}
            </View>
            <ThemedText style={styles.hudHint}>
              {!scanEnabled
                ? t('Đang khởi động camera…', 'Starting camera…')
                : manualCloudScan
                  ? t('Căn biển số vào khung, rồi chạm Quét ngay', 'Align the plate in the frame, then tap Scan now')
                  : t('Giữ ổn định — tự nhận diện khi thấy biển số', 'Hold steady — auto-detects when a plate is found')}
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
              <Ionicons color={DesignColors.onPrimary} name="scan" size={20} />
              <ThemedText style={styles.captureButtonLabel}>
                {scanBlockedByCooldown
                  ? t(`Đợi ${cooldownSeconds}s`, `Wait ${cooldownSeconds}s`)
                  : t('Quét ngay', 'Scan now')}
              </ThemedText>
            </Pressable>
            {footer ? <View style={styles.footerSlot}>{footer}</View> : null}
          </View>
        </View>
      </>
    );
  };

  if (!visible) {
    return null;
  }

  const scannerContent = (
    <View style={styles.root}>
      <View style={styles.cameraHost}>{renderBody()}</View>

      <View style={[styles.floatingTopBar, { paddingTop: insets.top + Spacing.sm }]}>
        {showCloseButton ? (
          <Pressable
            accessibilityLabel={t('Đóng', 'Close')}
            hitSlop={12}
            onPress={onClose}
            style={styles.closeButton}>
            <Ionicons color={DesignColors.ink} name="close" size={22} />
          </Pressable>
        ) : (
          <View style={styles.topSpacer} />
        )}
        <View style={styles.titlePill}>
          <View style={styles.topTitleChip}>
            <ThemedText style={styles.topTitle}>{topBarTitle}</ThemedText>
          </View>
        </View>
        <View style={styles.topSpacer} />
      </View>
    </View>
  );

  if (embedded) {
    return scannerContent;
  }

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onClose}
      statusBarTranslucent
      visible>
      {scannerContent}
    </Modal>
  );
}

function createStyles(
  DesignColors: ReturnType<typeof useStaffDesignColors>,
  isDark: boolean,
) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    floatingTopBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.sm,
      zIndex: 20,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.88)',
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
    },
    titlePill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.sm,
    },
    topTitleChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.92)',
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
    },
    topTitle: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '600',
      fontSize: 15,
    },
    topSpacer: {
      width: 40,
    },
    cameraHost: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
      overflow: 'hidden',
    },
    cameraFeed: {
      ...StyleSheet.absoluteFillObject,
      transform: [{ scale: 1.06 }],
    },
    frameHint: {
      position: 'absolute',
      alignSelf: 'center',
      left: Spacing.lg,
      right: Spacing.lg,
      ...Typography.caption,
      color: DesignColors.ink,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.2,
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: Radius.pill,
      backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.92)',
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      overflow: 'hidden',
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
      backgroundColor: DesignColors.primaryFocus,
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
      paddingHorizontal: Spacing.md,
      paddingTop: 0,
    },
    hudCard: {
      alignItems: 'stretch',
      gap: 6,
      borderRadius: Radius.xl,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
      backgroundColor: DesignColors.surface1,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    brandMark: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: DesignColors.glowViolet,
      borderWidth: 1,
      borderColor: DesignColors.primary,
    },
    brandCopy: {
      flex: 1,
      gap: 1,
    },
    brandName: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '800',
      fontSize: 15,
      letterSpacing: 1.2,
    },
    brandTagline: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 10,
    },
    hudHint: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textAlign: 'center',
      lineHeight: 16,
      fontSize: 11,
    },
    hudStatus: {
      ...Typography.caption,
      color: DesignColors.accentSky,
      textAlign: 'center',
      lineHeight: 16,
      fontSize: 11,
    },
    captureButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      borderRadius: Radius.pill,
      paddingHorizontal: Spacing.xl,
      paddingVertical: 10,
      minHeight: 44,
      alignSelf: 'center',
      minWidth: '72%',
      backgroundColor: DesignColors.primaryFocus,
      borderWidth: 0,
    },
    captureButtonLabel: {
      ...Typography.button,
      color: DesignColors.onPrimary,
      fontWeight: '700',
      fontSize: 15,
    },
    captureButtonPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.98 }],
    },
    captureButtonDisabled: {
      opacity: 0.42,
    },
    footerSlot: {
      alignItems: 'center',
      paddingTop: 2,
    },
  });
}
