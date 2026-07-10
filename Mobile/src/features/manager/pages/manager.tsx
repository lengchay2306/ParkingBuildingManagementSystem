import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { DesignColorPalette, Radius, Spacing, Typography } from "@/constants/design";
import { MaxContentWidth } from "@/constants/theme";
import { useDesignColors } from "@/hooks/use-design-colors";
import { useLanguagePreference } from "@/hooks/language-preference";

const getMetrics = (t: (vi: string, en: string) => string) => [
  {
    label: t("Công suất", "Occupancy"),
    value: "84%",
    detail: t("482 / 574 chỗ", "482 / 574 slots"),
  },
  { label: t("Doanh thu hôm nay", "Revenue today"), value: "$14,204", detail: "+12% MoM" },
  { label: t("Thời gian gửi trung bình", "Average stay"), value: "1h 42m", detail: "-6m vs week" },
  { label: t("Điều hướng lại bởi AI", "AI reroutes"), value: "127", detail: t("hôm nay", "today") },
];

const getAlerts = (t: (vi: string, en: string) => string) => [
  {
    title: t("B2 sắp đầy công suất", "B2 reaching capacity"),
    detail: t(
      "Dự báo 96% trong 18 phút, đã bật điều hướng lại",
      "Predicted 96% in 18m, reroute active",
    ),
  },
  {
    title: t("Cảm biến B2-008 ngoại tuyến", "Sensor B2-008 offline"),
    detail: t("Ping cuối 6 phút trước, đã cử kỹ thuật", "Last ping 6 min ago, dispatch tech"),
  },
  {
    title: t("Cổng 3 mở tay", "Gate 3 manual override"),
    detail: t("Nhân viên #41, 14:38", "Staff #41, 14:38"),
  },
];

const getOccupancy = (DesignColors: DesignColorPalette, t: (vi: string, en: string) => string) => [
  { label: t("Trống", "Empty"), value: "92", color: DesignColors.semanticSuccess },
  { label: t("Đầy", "Full"), value: "482", color: DesignColors.primary },
  { label: t("Bảo trì", "Maint"), value: "6", color: DesignColors.inkSubtle },
];

export default function ManagerScreen() {
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const occupancy = useMemo(() => getOccupancy(DesignColors, t), [DesignColors, t]);
  const metrics = useMemo(() => getMetrics(t), [t]);
  const alerts = useMemo(() => getAlerts(t), [t]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.eyebrow}>
            {t("Vai trò 01 - Quản lý cơ sở", "Role 01 - Facility Manager")}
          </ThemedText>
          <ThemedText style={styles.title}>
            {t("Tóm tắt điều hành di động", "Mobile command summary")}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            {t(
              "Giao diện di động giúp ra quyết định nhanh dựa trên công suất thời gian thực và mức ưu tiên cảnh báo.",
              "Mobile view distills the next decision into live occupancy and alert priority.",
            )}
          </ThemedText>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <ThemedText style={styles.cardTitle}>North Plaza</ThemedText>
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{t("Trực tiếp", "Live")}</ThemedText>
            </View>
          </View>
          <View style={styles.occupancyRow}>
            <View>
              <ThemedText style={styles.metricValue}>84%</ThemedText>
              <ThemedText style={styles.metricDetail}>482 / 574 slots</ThemedText>
            </View>
            <View style={styles.occupancyList}>
              {occupancy.map((item) => (
                <View key={item.label} style={styles.occupancyItem}>
                  <View style={[styles.occupancyDot, { backgroundColor: item.color }]} />
                  <ThemedText style={styles.occupancyLabel}>{item.label}</ThemedText>
                  <ThemedText style={styles.occupancyValue}>{item.value}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.metricGrid}>
          {metrics.map((item) => (
            <View key={item.label} style={styles.metricCard}>
              <ThemedText style={styles.metricLabel}>{item.label}</ThemedText>
              <ThemedText style={styles.metricValueSm}>{item.value}</ThemedText>
              <ThemedText style={styles.metricDetail}>{item.detail}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <ThemedText style={styles.cardTitle}>
              {t("Cảnh báo ưu tiên", "Priority alerts")}
            </ThemedText>
            <ThemedText style={styles.badgeText}>{t("3 mới", "3 new")}</ThemedText>
          </View>
          <View style={styles.list}>
            {alerts.map((alert) => (
              <View key={alert.title} style={styles.alertItem}>
                <View style={styles.alertDot} />
                <View style={styles.alertText}>
                  <ThemedText style={styles.alertTitle}>{alert.title}</ThemedText>
                  <ThemedText style={styles.alertDetail}>{alert.detail}</ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.aiCard}>
          <ThemedText style={styles.aiEyebrow}>
            {t("AI - 2 giờ tới", "AI - Next 2 hours")}
          </ThemedText>
          <ThemedText style={styles.aiText}>
            {t(
              "Mở khu B3 dự phòng lúc 17:00 để hấp thụ thêm 120 xe.",
              "Open B3 reserve overflow at 17:00 to absorb 120 cars.",
            )}
          </ThemedText>
          <View style={styles.aiButton}>
            <ThemedText style={styles.aiButtonText}>{t("Lên lịch", "Schedule")}</ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
    },
    content: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.section,
      gap: Spacing.lg,
      width: "100%",
      maxWidth: MaxContentWidth,
      alignSelf: "center",
    },
    header: {
      gap: Spacing.xs,
    },
    eyebrow: {
      ...Typography.eyebrow,
      color: DesignColors.inkSubtle,
      textTransform: "uppercase",
    },
    title: {
      ...Typography.displayMd,
      color: DesignColors.ink,
    },
    subtitle: {
      ...Typography.body,
      color: DesignColors.inkMuted,
    },
    card: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    cardHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    badge: {
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.surface2,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    badgeText: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textTransform: "uppercase",
    },
    occupancyRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: Spacing.md,
      alignItems: "center",
    },
    occupancyList: {
      gap: Spacing.xs,
      flex: 1,
    },
    occupancyItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      backgroundColor: DesignColors.surface2,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    occupancyDot: {
      width: 6,
      height: 6,
      borderRadius: Radius.pill,
    },
    occupancyLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textTransform: "uppercase",
    },
    occupancyValue: {
      ...Typography.caption,
      color: DesignColors.ink,
      marginLeft: "auto",
    },
    metricGrid: {
      gap: Spacing.sm,
    },
    metricCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      gap: Spacing.xxs,
    },
    metricLabel: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textTransform: "uppercase",
    },
    metricValue: {
      ...Typography.headline,
      color: DesignColors.ink,
    },
    metricValueSm: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
    },
    metricDetail: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    list: {
      gap: Spacing.sm,
    },
    alertItem: {
      flexDirection: "row",
      gap: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.sm,
      backgroundColor: DesignColors.surface2,
    },
    alertDot: {
      width: 8,
      height: 8,
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.primary,
      marginTop: 4,
    },
    alertText: {
      flex: 1,
      gap: 2,
    },
    alertTitle: {
      ...Typography.bodySm,
      fontWeight: 600,
      color: DesignColors.ink,
    },
    alertDetail: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
    },
    aiCard: {
      backgroundColor: DesignColors.surface2,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    aiEyebrow: {
      ...Typography.eyebrow,
      color: DesignColors.inkSubtle,
      textTransform: "uppercase",
    },
    aiText: {
      ...Typography.bodySm,
      color: DesignColors.ink,
    },
    aiButton: {
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      paddingVertical: 8,
      alignItems: "center",
    },
    aiButtonText: {
      ...Typography.button,
      color: DesignColors.ink,
    },
  });
