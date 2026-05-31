import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DriverAppBar } from '@/components/driver/driver-app-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

/** parkos_unified_app_final_fixed — MY SPOT TAB (SCREEN_71) / active_sessions_adaptive */
export default function DriverSessionScreen() {
  const router = useRouter();
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <ThemedView style={styles.container}>
      <DriverAppBar />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>{t('Phiên gửi xe', 'My Session')}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {t(
              'Quản lý phiên gửi đang hoạt động và phương tiện đã đăng ký.',
              'Manage your active parking and registered vehicles.',
            )}
          </ThemedText>
        </View>

        <View style={styles.sessionCard}>
          <View style={styles.sessionTop}>
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleIcon}>
                <Ionicons color={DesignColors.primary} name="car" size={28} />
              </View>
              <View>
                <ThemedText style={styles.vehicleName}>Tesla Model 3</ThemedText>
                <ThemedText style={styles.plate}>BKH-8292</ThemedText>
              </View>
            </View>
            <View style={styles.statusBadge}>
              <ThemedText style={styles.statusText}>{t('Đang gửi', 'Available')}</ThemedText>
            </View>
          </View>

          <View style={styles.timerCard}>
            <View>
              <ThemedText style={styles.timerLabel}>{t('Thời gian còn lại', 'Time Remaining')}</ThemedText>
              <ThemedText style={styles.timerValue}>01:02:02</ThemedText>
            </View>
            <View style={styles.alignRight}>
              <ThemedText style={styles.timerLabel}>Spot ID</ThemedText>
              <ThemedText style={styles.spotValue}>A-242</ThemedText>
            </View>
          </View>

          <View style={styles.sessionFooter}>
            <Pressable
              onPress={() => router.push('/driver/session-detail' as never)}
              style={styles.detailsLink}
            >
              <ThemedText style={styles.detailsText}>{t('Xem chi tiết', 'View Details')}</ThemedText>
              <Ionicons color={DesignColors.primary} name="chevron-forward" size={16} />
            </Pressable>
            <ThemedText style={styles.location}>{t('Downtown Plaza', 'Parked at Downtown Plaza')}</ThemedText>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, gap: Spacing.xl, paddingBottom: Spacing.xl },
    header: { gap: 4 },
    title: { fontSize: 28, fontWeight: '800', color: DesignColors.ink },
    subtitle: { ...Typography.bodySm, color: DesignColors.inkSubtle },
    sessionCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
    vehicleIcon: {
      width: 56,
      height: 56,
      borderRadius: Radius.lg,
      backgroundColor: `${DesignColors.primary}1A`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vehicleName: { ...Typography.body, fontWeight: '700', fontSize: 18, color: DesignColors.ink },
    plate: {
      ...Typography.mono,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: DesignColors.inkSubtle,
    },
    statusBadge: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: `${DesignColors.semanticSuccess}33`,
      backgroundColor: `${DesignColors.semanticSuccess}1A`,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    statusText: {
      ...Typography.caption,
      fontWeight: '700',
      color: DesignColors.semanticSuccess,
    },
    timerCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: DesignColors.surface2,
      borderRadius: Radius.lg,
      padding: Spacing.md,
    },
    timerLabel: {
      ...Typography.caption,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: DesignColors.inkSubtle,
    },
    timerValue: { fontSize: 24, fontWeight: '900', color: DesignColors.primary },
    spotValue: { ...Typography.button, fontWeight: '700', color: DesignColors.ink },
    alignRight: { alignItems: 'flex-end' },
    sessionFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    detailsText: { ...Typography.bodySm, fontWeight: '500', color: DesignColors.primary },
    location: { ...Typography.caption, color: DesignColors.inkSubtle },
  });
