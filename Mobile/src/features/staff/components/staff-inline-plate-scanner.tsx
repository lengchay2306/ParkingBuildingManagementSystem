import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView } from "expo-camera";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/design";
import { CHECKIN_CAMERA_OVERLAY_INSET } from "@/features/staff/components/staff-check-in-layout";
import { usePlateScanner } from "@/features/staff/hooks/use-plate-scanner";
import {
  PLATE_VIEWFINDER,
  getPlateViewfinderFrameBottom,
  getPlateViewfinderMarginTop,
  getPlateViewfinderScanBandBottom,
} from "@/features/staff/lib/plate-scanner-viewfinder";
import { useDesignColors } from "@/hooks/use-design-colors";

type StaffInlinePlateScannerProps = {
  active: boolean;
  onPlateDetected: (plate: string) => void;
  onCancel: () => void;
  t: (vi: string, en: string) => string;
  style?: StyleProp<ViewStyle>;
};

function PlateScanOverlay({ accentColor }: { accentColor: string }) {
  const scanY = useSharedValue(0);
  const { width, height } = PLATE_VIEWFINDER;
  const marginTop = getPlateViewfinderMarginTop();
  const marginX = (1 - width) / 2;
  const frameBottom = getPlateViewfinderFrameBottom();
  const scanBandBottom = getPlateViewfinderScanBandBottom();
  const gapBandHeight = Math.max(scanBandBottom - frameBottom, 0);

  React.useEffect(() => {
    scanY.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [scanY]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${marginTop * 100 + scanY.value * height * 100}%` as `${number}%`,
  }));

  const frameLeft = `${marginX * 100}%` as `${number}%`;
  const frameWidth = `${width * 100}%` as `${number}%`;
  const frameTop = `${marginTop * 100}%` as `${number}%`;
  const frameHeight = `${height * 100}%` as `${number}%`;
  const sideGutter = `${marginX * 100}%` as `${number}%`;
  const topGutter = `${marginTop * 100}%` as `${number}%`;
  const hudGutter = `${(1 - scanBandBottom) * 100}%` as `${number}%`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[overlayStyles.dim, { top: 0, left: 0, right: 0, height: topGutter }]} />
      {gapBandHeight > 0 ? (
        <View
          style={[
            overlayStyles.dimSoft,
            {
              top: `${frameBottom * 100}%`,
              left: 0,
              right: 0,
              height: `${gapBandHeight * 100}%`,
            },
          ]}
        />
      ) : null}
      <View
        style={[
          overlayStyles.dim,
          { top: topGutter, bottom: hudGutter, left: 0, width: sideGutter },
        ]}
      />
      <View
        style={[
          overlayStyles.dim,
          { top: topGutter, bottom: hudGutter, right: 0, width: sideGutter },
        ]}
      />
      <View
        style={[
          overlayStyles.frame,
          {
            left: frameLeft,
            width: frameWidth,
            top: frameTop,
            height: frameHeight,
            borderColor: accentColor,
          },
        ]}
      />
      <Animated.View
        style={[
          overlayStyles.scanLine,
          { left: frameLeft, width: frameWidth, backgroundColor: accentColor },
          scanLineStyle,
        ]}
      />
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  dim: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  dimSoft: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  frame: {
    position: "absolute",
    borderRadius: Radius.md,
    borderWidth: 2,
  },
  scanLine: {
    position: "absolute",
    height: 2,
    opacity: 0.9,
  },
});

export function StaffInlinePlateScanner({
  active,
  onPlateDetected,
  onCancel,
  t,
  style,
}: StaffInlinePlateScannerProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const {
    cameraRef,
    permission,
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
  } = usePlateScanner({ active, onPlateDetected, t });

  if (!active) {
    return null;
  }

  const rootStyle = [styles.root, style];

  if (!permission) {
    return (
      <View style={[rootStyle, styles.centered]}>
        <ActivityIndicator color={DesignColors.primaryFocus} />
      </View>
    );
  }

  if (!ocrAvailable) {
    return (
      <View style={[rootStyle, styles.centered]}>
        <ThemedText style={styles.hint}>{t("OCR không khả dụng", "OCR unavailable")}</ThemedText>
        <Pressable onPress={onCancel} style={styles.floatingCancelBtn}>
          <ThemedText style={styles.cancelText}>{t("Hủy", "Cancel")}</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (cameraError) {
    return (
      <View style={[rootStyle, styles.centered]}>
        <ThemedText style={styles.hint}>
          {t("Không mở được camera", "Camera failed to start")}
        </ThemedText>
        <ThemedText style={styles.subHint}>{cameraError}</ThemedText>
        <Pressable onPress={onCancel} style={styles.floatingCancelBtn}>
          <ThemedText style={styles.cancelText}>{t("Quay lại", "Go back")}</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[rootStyle, styles.centered]}>
        <ThemedText style={styles.hint}>
          {t("Cần quyền camera để quét", "Camera permission required")}
        </ThemedText>
        <Pressable onPress={onCancel} style={styles.floatingCancelBtn}>
          <ThemedText style={styles.cancelText}>{t("Quay lại", "Go back")}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={rootStyle}>
      <View style={styles.cameraClip}>
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
            setCameraError(message);
          }}
        />
        <PlateScanOverlay accentColor={DesignColors.primaryFocus} />
      </View>

      <Pressable
        accessibilityLabel={t("Đóng", "Close")}
        hitSlop={12}
        onPress={onCancel}
        style={styles.closeBtn}
      >
        <Ionicons color={DesignColors.ink} name="close" size={20} />
      </Pressable>

      <ThemedText style={styles.alignLabel}>
        {t("CĂN CHỈNH BIỂN SỐ...", "ALIGNING PLATE...")}
      </ThemedText>

      <View style={styles.liveBadgeAnchor}>
        <View style={styles.liveBadge}>
          {!scanEnabled || isProcessing ? (
            <ActivityIndicator color={DesignColors.neonSuccess} size="small" />
          ) : (
            <View style={styles.liveDot} />
          )}
          <ThemedText style={styles.liveText}>
            {!scanEnabled
              ? t("Đang khởi động…", "Starting…")
              : manualCloudScan
                ? t("Chạm Quét ngay", "Tap Scan now")
                : t("Đang quét", "Scanning")}
          </ThemedText>
        </View>
      </View>

      {statusMessage ? (
        <View style={styles.statusAnchor}>
          <ThemedText style={styles.status}>{statusMessage}</ThemedText>
        </View>
      ) : null}

      <View style={styles.scanBtnAnchor}>
        <Pressable
          disabled={!scanEnabled || isProcessing || scanBlockedByCooldown}
          onPress={() => void runScanTick()}
          style={({ pressed }) => [
            styles.scanBtn,
            pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] },
            (!scanEnabled || isProcessing || scanBlockedByCooldown) && styles.scanBtnDisabled,
          ]}
        >
          <Ionicons color={DesignColors.onPrimary} name="scan" size={18} />
          <ThemedText style={styles.scanBtnText}>
            {scanBlockedByCooldown
              ? t(`Đợi ${cooldownSeconds}s`, `Wait ${cooldownSeconds}s`)
              : t("Quét ngay", "Scan now")}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  const overlayInset = CHECKIN_CAMERA_OVERLAY_INSET;
  const closeBtnSize = 36;

  return StyleSheet.create({
    root: {
      flex: 1,
      width: "100%",
      height: "100%",
      position: "relative",
    },
    cameraClip: {
      ...StyleSheet.absoluteFillObject,
      overflow: "hidden",
      backgroundColor: "#000",
    },
    cameraFeed: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },
    centered: {
      alignItems: "center",
      justifyContent: "center",
      gap: Spacing.sm,
      padding: Spacing.md,
      backgroundColor: DesignColors.surface3,
    },
    hint: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      textAlign: "center",
      fontWeight: "600",
    },
    subHint: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textAlign: "center",
    },
    floatingCancelBtn: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 8,
      borderRadius: Radius.pill,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderWidth: 1,
      borderColor: DesignColors.hairline,
    },
    cancelText: {
      ...Typography.caption,
      color: DesignColors.ink,
      fontWeight: "600",
    },
    closeBtn: {
      position: "absolute",
      top: overlayInset,
      left: overlayInset,
      zIndex: 20,
      width: closeBtnSize,
      height: closeBtnSize,
      borderRadius: closeBtnSize / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.62)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    alignLabel: {
      position: "absolute",
      top: overlayInset + 4,
      left: overlayInset,
      right: overlayInset,
      zIndex: 10,
      ...Typography.caption,
      color: DesignColors.primaryFocus,
      fontWeight: "700",
      letterSpacing: 1.1,
      fontSize: 11,
      textAlign: "center",
    },
    liveBadgeAnchor: {
      position: "absolute",
      bottom: 58,
      left: overlayInset,
      right: overlayInset,
      zIndex: 10,
      alignItems: "center",
    },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: Radius.pill,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderWidth: 1,
      borderColor: `${DesignColors.neonSuccess}44`,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: DesignColors.neonSuccess,
    },
    liveText: {
      ...Typography.caption,
      color: DesignColors.neonSuccess,
      fontSize: 10,
      fontWeight: "600",
    },
    statusAnchor: {
      position: "absolute",
      bottom: 88,
      left: overlayInset,
      right: overlayInset,
      zIndex: 10,
      alignItems: "center",
    },
    status: {
      ...Typography.caption,
      color: DesignColors.accentSky,
      fontSize: 10,
      textAlign: "center",
      backgroundColor: "rgba(0,0,0,0.45)",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: Radius.md,
      overflow: "hidden",
      maxWidth: "100%",
    },
    scanBtnAnchor: {
      position: "absolute",
      bottom: overlayInset,
      left: overlayInset,
      right: overlayInset,
      zIndex: 20,
      alignItems: "center",
    },
    scanBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: Radius.pill,
      backgroundColor: "rgba(79, 70, 229, 0.92)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      shadowColor: DesignColors.primaryFocus,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 10,
      elevation: 8,
    },
    scanBtnDisabled: {
      opacity: 0.45,
    },
    scanBtnText: {
      ...Typography.caption,
      color: DesignColors.onPrimary,
      fontWeight: "700",
      fontSize: 13,
    },
  });
}
