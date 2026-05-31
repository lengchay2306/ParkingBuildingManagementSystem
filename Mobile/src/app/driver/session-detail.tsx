import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

const INITIAL_ELAPSED_SECONDS = 45 * 60 + 30;
const SESSION_PROGRESS = 0.35;

function formatElapsed(totalSeconds: number) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((n) => n.toString().padStart(2, '0')).join(':');
}

/** session_details_adaptive_new_timeline — active session detail */
export default function DriverSessionDetailScreen() {
  const router = useRouter();
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [elapsedSeconds, setElapsedSeconds] = useState(INITIAL_ELAPSED_SECONDS);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckout = () => {
    router.push('/driver/payment' as never);
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
          >
            <Ionicons color={DesignColors.inkSubtle} name="chevron-back" size={24} />
          </Pressable>
          <ThemedText style={styles.screenLabel}>
            {t('Chi tiết phiên gửi', 'Session Details')}
          </ThemedText>
        </View>

        <View style={styles.timelineCard}>
          <View style={styles.timelineTop}>
            <View>
              <ThemedText style={styles.metaLabel}>{t('Trạng thái hiện tại', 'Current Status')}</ThemedText>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <ThemedText style={styles.statusOnTrack}>{t('Đúng giờ', 'On Track')}</ThemedText>
              </View>
            </View>
            <View style={styles.alignRight}>
              <ThemedText style={styles.metaLabel}>{t('Thời gian đã gửi', 'Elapsed Time')}</ThemedText>
              <ThemedText style={styles.elapsedTimer}>{formatElapsed(elapsedSeconds)}</ThemedText>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${SESSION_PROGRESS * 100}%` }]} />
          </View>

          <View style={styles.timeGrid}>
            <View>
              <ThemedText style={styles.metaLabel}>{t('Giờ vào', 'Check-in Time')}</ThemedText>
              <View style={styles.timeRow}>
                <Ionicons color={DesignColors.inkSubtle} name="log-in-outline" size={14} />
                <ThemedText style={styles.timeValue}>10:45 AM</ThemedText>
              </View>
            </View>
            <View>
              <ThemedText style={styles.metaLabel}>{t('Dự kiến ra', 'Estimated End')}</ThemedText>
              <View style={styles.timeRow}>
                <Ionicons color={DesignColors.inkSubtle} name="log-out-outline" size={14} />
                <ThemedText style={styles.timeValue}>12:45 PM</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.timelineFooter}>
            <ThemedText style={styles.validText}>
              {t('Hiệu lực 2 giờ (Giá tiêu chuẩn)', 'Valid for 2 hours (Standard Rate)')}
            </ThemedText>
            <View style={styles.earlyBadge}>
              <ThemedText style={styles.earlyBadgeText}>
                {t('Có thể ra sớm', 'Early Exit Possible')}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <ThemedText style={styles.metaLabel}>{t('Phí hiện tại', 'Current Cost')}</ThemedText>
              <Ionicons color={DesignColors.inkSubtle} name="card-outline" size={20} />
            </View>
            <ThemedText style={styles.costValue}>$465.36</ThemedText>
            <ThemedText style={styles.costRate}>+$50.0 / min</ThemedText>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <ThemedText style={styles.metaLabel}>Slot ID</ThemedText>
              <Ionicons color={DesignColors.inkSubtle} name="location-outline" size={20} />
            </View>
            <ThemedText style={styles.slotValue}>B1-A1-L12</ThemedText>
            <ThemedText style={styles.slotMeta}>
              {t('Tầng B1 - Hàng AL12', 'Floor B1 - Row AL12')}
            </ThemedText>
          </View>
        </View>

        <View style={styles.checkoutSection}>
          <Pressable
            onPress={handleCheckout}
            style={({ pressed }) => [styles.checkoutButton, pressed && styles.checkoutPressed]}
          >
            <Ionicons color={DesignColors.onPrimary} name="cart" size={22} />
            <ThemedText style={styles.checkoutText}>{t('THANH TOÁN NGAY', 'CHECKOUT NOW')}</ThemedText>
          </Pressable>
          <ThemedText style={styles.checkoutHint}>
            {t(
              'Giá cuối cùng bao gồm thuế và phí dịch vụ áp dụng.',
              'Final price will include applicable taxes and service fees.',
            )}
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.xl },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backPressed: { backgroundColor: DesignColors.surface1 },
    screenLabel: {
      ...Typography.caption,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 3,
      color: DesignColors.inkSubtle,
    },
    timelineCard: {
      backgroundColor: `${DesignColors.surface1}CC`,
      borderRadius: Radius.xxl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    timelineTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    metaLabel: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: DesignColors.inkSubtle,
      marginBottom: 4,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.semanticSuccess,
    },
    statusOnTrack: {
      ...Typography.bodySm,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: DesignColors.semanticSuccess,
    },
    alignRight: { alignItems: 'flex-end' },
    elapsedTimer: { fontSize: 24, fontWeight: '900', lineHeight: 30, color: DesignColors.primary },
    progressTrack: {
      height: 6,
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.hairline,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: DesignColors.primary },
    timeGrid: { flexDirection: 'row', gap: Spacing.xl },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    timeValue: { ...Typography.bodySm, fontWeight: '600', color: DesignColors.ink },
    timelineFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: `${DesignColors.hairline}80`,
      paddingTop: Spacing.md,
      gap: Spacing.sm,
    },
    validText: { ...Typography.caption, fontSize: 11, fontWeight: '500', color: DesignColors.inkSubtle, flex: 1 },
    earlyBadge: {
      borderRadius: Radius.sm,
      backgroundColor: `${DesignColors.primary}1A`,
      paddingHorizontal: Spacing.xs,
      paddingVertical: 2,
    },
    earlyBadgeText: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      color: DesignColors.primary,
    },
    statsGrid: { flexDirection: 'row', gap: Spacing.md },
    statCard: {
      flex: 1,
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xxl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.xs,
    },
    statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    costValue: { fontSize: 28, fontWeight: '900', lineHeight: 34, color: DesignColors.ink },
    costRate: { ...Typography.caption, fontSize: 11, fontWeight: '500', color: DesignColors.primary },
    slotValue: { fontSize: 22, fontWeight: '900', lineHeight: 28, color: DesignColors.ink },
    slotMeta: { ...Typography.caption, fontSize: 11, fontWeight: '500', color: DesignColors.inkSubtle },
    checkoutSection: { gap: Spacing.md, marginTop: Spacing.xs },
    checkoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      height: 64,
      backgroundColor: DesignColors.primary,
      borderRadius: Radius.xl,
      shadowColor: DesignColors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    checkoutPressed: { opacity: 0.92 },
    checkoutText: { ...Typography.body, fontWeight: '700', fontSize: 18, color: DesignColors.onPrimary },
    checkoutHint: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '500',
      textAlign: 'center',
      color: DesignColors.inkSubtle,
    },
  });
