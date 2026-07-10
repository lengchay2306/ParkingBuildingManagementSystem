import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { DesignColorPalette, Radius, Spacing, Typography } from "@/constants/design";
import type { CustomerParkingSession } from "@/features/customer/api/parking";
import type { UserVehicle } from "@/lib/auth-api";

function formatElapsed(checkInTime: string | undefined) {
  if (!checkInTime) {
    return "00:00:00";
  }
  const diff = Math.max(0, Date.now() - new Date(checkInTime).getTime());
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1_000);
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function resolveSlotLabel(session: CustomerParkingSession | null) {
  if (!session || typeof session.parkingSlotId !== "object") {
    return "—";
  }
  const floor = session.parkingSlotId.floorId?.floorName;
  const slot = session.parkingSlotId.slotNumber;
  if (floor && slot) {
    return `${floor} · ${slot}`;
  }
  return slot ?? "—";
}

type Props = {
  fullName: string;
  defaultVehicle: UserVehicle | null;
  activeSession: CustomerParkingSession | null;
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

/** Thẻ tổng quan: trạng thái xe, biển số mặc định, số dư ví. */
export function CustomerHomeOverviewCard({
  fullName,
  defaultVehicle,
  activeSession,
  t,
  DesignColors,
}: Props) {
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const isParked = activeSession?.status?.toUpperCase() === "ACTIVE";
  const [elapsed, setElapsed] = useState(() => formatElapsed(activeSession?.checkInTime));

  useEffect(() => {
    if (!isParked) {
      return;
    }
    setElapsed(formatElapsed(activeSession?.checkInTime));
    const timer = setInterval(() => {
      setElapsed(formatElapsed(activeSession?.checkInTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession?.checkInTime, isParked]);

  const plate = defaultVehicle?.licensePlate ?? t("Chưa có xe", "No vehicle");

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <ThemedText style={styles.caption}>{t("Xin chào", "Welcome")}</ThemedText>
          <ThemedText style={styles.name}>{fullName}</ThemedText>
        </View>
        <View style={styles.walletBadge}>
          <Ionicons name="wallet-outline" size={14} color={DesignColors.primary} />
          <ThemedText style={styles.walletText}>{t("$24.50", "$24.50")}</ThemedText>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusPill, isParked ? styles.statusParked : styles.statusOutside]}>
          <View style={[styles.statusDot, isParked ? styles.dotParked : styles.dotOutside]} />
          <ThemedText style={styles.statusText}>
            {isParked ? t("Đang trong bãi", "Parked") : t("Ngoài bãi", "Outside")}
          </ThemedText>
        </View>
        <View style={styles.plateBadge}>
          <ThemedText style={styles.plateLabel}>{t("Biển số", "Plate")}</ThemedText>
          <ThemedText style={styles.plateValue}>{plate}</ThemedText>
        </View>
      </View>

      {isParked ? (
        <View style={styles.activeSession}>
          <View style={styles.activeHeader}>
            <ThemedText style={styles.activeEyebrow}>
              {t("Phiên đang mở", "Active session")}
            </ThemedText>
            <ThemedText style={styles.activeSlot}>{resolveSlotLabel(activeSession)}</ThemedText>
          </View>
          <ThemedText style={styles.activeTimer}>{elapsed}</ThemedText>
          <ThemedText style={styles.activeHint}>
            {t("Thời gian gửi từ lúc check-in", "Time since check-in")}
          </ThemedText>
        </View>
      ) : (
        <ThemedText style={styles.outsideHint}>
          {t(
            "Xe chưa trong bãi. Quét QR hoặc đặt chỗ trước khi đến.",
            "Vehicle is not in the lot. Scan QR or reserve before arrival.",
          )}
        </ThemedText>
      )}
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: Spacing.sm,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    caption: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    name: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    walletBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    walletText: {
      ...Typography.caption,
      color: DesignColors.ink,
      fontWeight: "600",
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
      flexWrap: "wrap",
    },
    statusPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: Radius.pill,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
      borderWidth: 1,
    },
    statusParked: {
      borderColor: DesignColors.semanticSuccess,
      backgroundColor: `${DesignColors.semanticSuccess}18`,
    },
    statusOutside: {
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: Radius.pill,
    },
    dotParked: {
      backgroundColor: DesignColors.semanticSuccess,
    },
    dotOutside: {
      backgroundColor: DesignColors.inkMuted,
    },
    statusText: {
      ...Typography.caption,
      fontWeight: "600",
      color: DesignColors.ink,
    },
    plateBadge: {
      alignItems: "flex-end",
      gap: 2,
    },
    plateLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    plateValue: {
      ...Typography.mono,
      color: DesignColors.ink,
      letterSpacing: 0.4,
    },
    activeSession: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      padding: Spacing.sm,
      gap: 4,
    },
    activeHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: Spacing.sm,
    },
    activeEyebrow: {
      ...Typography.caption,
      color: DesignColors.primary,
      textTransform: "uppercase",
    },
    activeSlot: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    activeTimer: {
      ...Typography.headline,
      color: DesignColors.ink,
    },
    activeHint: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
    },
    outsideHint: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
    },
  });
