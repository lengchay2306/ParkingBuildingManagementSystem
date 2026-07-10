import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Linking, StyleSheet, View } from "react-native";

import { ScalePressable } from "@/components/scale-pressable";
import { ThemedText } from "@/components/themed-text";
import { DesignColorPalette, Radius, Spacing, Typography } from "@/constants/design";
import type { Reservation } from "@/features/customer/api/reservations";
import { ReservationCard } from "@/features/customer/components/reservation-card";
import { CUSTOMER_ROUTES } from "@/roles";

type Props = {
  reservations: Reservation[];
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

const HOTLINE = "19001234";

function createReservationStyles(DesignColors: DesignColorPalette) {
  return {
    reservationCard: {
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      padding: Spacing.sm,
      gap: Spacing.xs,
    },
    reservationHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: Spacing.sm,
    },
    plateBadge: {
      borderRadius: Radius.sm,
      backgroundColor: DesignColors.surface1,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    plateText: {
      ...Typography.mono,
      color: DesignColors.ink,
      letterSpacing: 0.4,
    },
    statusPill: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
    },
    statusPillText: {
      ...Typography.caption,
      fontWeight: "600" as const,
    },
    infoRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      gap: Spacing.md,
    },
    infoLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      flex: 1,
    },
    infoValue: {
      ...Typography.caption,
      color: DesignColors.ink,
      flex: 1,
      textAlign: "right" as const,
    },
  };
}

/** Lịch sử gửi xe gần đây và khu vực hỗ trợ. */
export function CustomerHomeBottomSection({ reservations, t, DesignColors }: Props) {
  const router = useRouter();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const reservationStyles = useMemo(() => createReservationStyles(DesignColors), [DesignColors]);
  const recent = reservations.slice(0, 3);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>
            {t("Lịch sử gần đây", "Recent history")}
          </ThemedText>
          <ScalePressable
            onPress={() => router.push(CUSTOMER_ROUTES.reservations as never)}
            style={styles.linkButton}
            scaleTo={0.95}
          >
            <ThemedText style={styles.linkText}>{t("Xem tất cả", "View all")}</ThemedText>
          </ScalePressable>
        </View>

        {recent.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            {t("Chưa có lịch sử đặt chỗ", "No reservation history yet")}
          </ThemedText>
        ) : (
          <View style={styles.list}>
            {recent.map((item) => (
              <ScalePressable
                key={item._id}
                onPress={() => router.push(CUSTOMER_ROUTES.reservations as never)}
                style={styles.historyItem}
                scaleTo={0.98}
              >
                <ReservationCard
                  reservation={item}
                  t={t}
                  styles={reservationStyles}
                  DesignColors={DesignColors}
                />
              </ScalePressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <ThemedText style={styles.sectionTitle}>{t("Hỗ trợ", "Support")}</ThemedText>
        <View style={styles.supportList}>
          <ScalePressable
            onPress={() => void Linking.openURL(`tel:${HOTLINE}`)}
            style={styles.supportRow}
            scaleTo={0.98}
          >
            <View style={styles.supportIcon}>
              <Ionicons name="call-outline" size={18} color={DesignColors.primary} />
            </View>
            <View style={styles.supportText}>
              <ThemedText style={styles.supportLabel}>
                {t("Hotline 24/7", "24/7 hotline")}
              </ThemedText>
              <ThemedText style={styles.supportValue}>1900 1234</ThemedText>
            </View>
          </ScalePressable>

          <ScalePressable
            onPress={() => void Linking.openURL("mailto:contact@parkingbs.vn")}
            style={styles.supportRow}
            scaleTo={0.98}
          >
            <View style={styles.supportIcon}>
              <Ionicons name="mail-outline" size={18} color={DesignColors.primary} />
            </View>
            <View style={styles.supportText}>
              <ThemedText style={styles.supportLabel}>
                {t("Email hỗ trợ", "Support email")}
              </ThemedText>
              <ThemedText style={styles.supportValue}>contact@parkingbs.vn</ThemedText>
            </View>
          </ScalePressable>

          <ScalePressable
            onPress={() => router.push(CUSTOMER_ROUTES.settings as never)}
            style={styles.supportRow}
            scaleTo={0.98}
          >
            <View style={styles.supportIcon}>
              <Ionicons name="settings-outline" size={18} color={DesignColors.primary} />
            </View>
            <View style={styles.supportText}>
              <ThemedText style={styles.supportLabel}>
                {t("Cài đặt ứng dụng", "App settings")}
              </ThemedText>
              <ThemedText style={styles.supportValue}>
                {t("Ngôn ngữ, giao diện", "Language, theme")}
              </ThemedText>
            </View>
          </ScalePressable>
        </View>
      </View>
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    wrap: {
      gap: Spacing.md,
    },
    card: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: Spacing.sm,
    },
    sectionTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    linkButton: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    linkText: {
      ...Typography.caption,
      color: DesignColors.primary,
      fontWeight: "600",
    },
    emptyText: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
      textAlign: "center",
      paddingVertical: Spacing.sm,
    },
    list: {
      gap: Spacing.sm,
    },
    historyItem: {
      borderRadius: Radius.md,
    },
    supportList: {
      gap: Spacing.xs,
    },
    supportRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface2,
      padding: Spacing.sm,
    },
    supportIcon: {
      width: 36,
      height: 36,
      borderRadius: Radius.md,
      backgroundColor: DesignColors.surface1,
      alignItems: "center",
      justifyContent: "center",
    },
    supportText: {
      flex: 1,
      gap: 2,
    },
    supportLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    supportValue: {
      ...Typography.bodySm,
      color: DesignColors.ink,
    },
  });
