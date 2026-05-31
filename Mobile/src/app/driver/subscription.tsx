import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAppToast } from '@/components/app-toast';
import { DriverAppBar } from '@/components/driver/driver-app-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

const STANDARD_FEATURES = [
  { vi: 'Truy cập bãi đỗ cơ bản', en: 'Access to standard parking lots' },
  { vi: 'Hỗ trợ tiêu chuẩn', en: 'Standard support' },
  { vi: 'Sử dụng ứng dụng di động', en: 'Mobile app access' },
];

const PREMIUM_FEATURES = [
  { vi: 'Bao gồm tất cả đặc quyền của Standard', en: 'Includes all Standard benefits' },
  { vi: 'Giảm 5% cho tất cả lượt đỗ', en: '5% off every parking session' },
  { vi: 'Hỗ trợ riêng biệt 24/7', en: 'Dedicated 24/7 support' },
];

/** subscription_plans_compact_vn — membership plans */
export default function DriverSubscriptionScreen() {
  const router = useRouter();
  const { showToast } = useAppToast();
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [upgrading, setUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      // TODO: connect subscription checkout API when available.
      await new Promise((resolve) => setTimeout(resolve, 900));
      showToast(t('Nâng cấp Premium thành công!', 'Premium upgrade successful!'), 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Không thể nâng cấp.', 'Upgrade failed.'),
        'error',
      );
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <DriverAppBar showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <ThemedText style={styles.heroTitle}>
            {t('Chọn Trải Nghiệm Của Bạn', 'Choose Your Experience')}
          </ThemedText>
          <ThemedText style={styles.heroDesc}>
            {t(
              'Mở khóa các địa điểm đỗ xe cao cấp, ưu tiên đặt chỗ và thanh toán tự động liền mạch với thẻ hội viên ParkOS.',
              'Unlock premium parking locations, priority booking, and seamless auto-pay with your ParkOS membership.',
            )}
          </ThemedText>
        </View>

        <View style={styles.grid}>
          {/* Standard */}
          <View style={styles.standardCard}>
            <View style={styles.cardHeader}>
              <View>
                <View style={styles.tierBadgeStandard}>
                  <ThemedText style={styles.tierBadgeText}>STANDARD</ThemedText>
                </View>
                <ThemedText style={styles.planTitle}>
                  {t('Hội viên Tiêu chuẩn', 'Standard Member')}
                </ThemedText>
              </View>
              <View style={styles.currentPlan}>
                <Ionicons color={DesignColors.primary} name="checkmark-circle" size={16} />
                <ThemedText style={styles.currentPlanText}>{t('Gói hiện tại', 'Current plan')}</ThemedText>
              </View>
            </View>

            <View style={styles.featureList}>
              {STANDARD_FEATURES.map((feature) => (
                <View key={feature.en} style={styles.featureRow}>
                  <Ionicons color={DesignColors.inkSubtle} name="checkmark" size={16} />
                  <ThemedText style={styles.featureTextStandard}>
                    {t(feature.vi, feature.en)}
                  </ThemedText>
                </View>
              ))}
            </View>

            <View style={styles.disabledButton}>
              <ThemedText style={styles.disabledButtonText}>
                {t('Gói đang kích hoạt', 'Active plan')}
              </ThemedText>
            </View>
          </View>

          {/* Premium */}
          <View style={styles.premiumCard}>
            <View style={styles.premiumGlow} />
            <View style={styles.cardHeader}>
              <View>
                <View style={styles.tierBadgePremium}>
                  <ThemedText style={styles.tierBadgePremiumText}>PREMIUM</ThemedText>
                </View>
                <ThemedText style={styles.planTitle}>
                  {t('Hội viên Đặc biệt', 'Premium Member')}
                </ThemedText>
              </View>
              <View style={styles.priceBlock}>
                <ThemedText style={styles.price}>99.000đ</ThemedText>
                <ThemedText style={styles.pricePeriod}>{t('/ tháng', '/ month')}</ThemedText>
              </View>
            </View>

            <View style={styles.featureList}>
              {PREMIUM_FEATURES.map((feature) => (
                <View key={feature.en} style={styles.featureRow}>
                  <Ionicons color={DesignColors.primary} name="sparkles" size={16} />
                  <ThemedText style={styles.featureTextPremium}>{t(feature.vi, feature.en)}</ThemedText>
                </View>
              ))}
            </View>

            <Pressable
              disabled={upgrading}
              onPress={handleUpgrade}
              style={({ pressed }) => [
                styles.upgradeButton,
                upgrading && styles.upgradeDisabled,
                pressed && !upgrading && styles.upgradePressed,
              ]}
            >
              {upgrading ? (
                <ActivityIndicator color={DesignColors.onPrimary} />
              ) : (
                <ThemedText style={styles.upgradeButtonText}>
                  {t('Nâng cấp Premium', 'Upgrade to Premium')}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.xl },
    hero: { gap: Spacing.xs },
    heroTitle: { fontSize: 24, fontWeight: '600', lineHeight: 30, color: DesignColors.ink },
    heroDesc: { ...Typography.bodySm, lineHeight: 20, color: DesignColors.inkSubtle },
    grid: { gap: Spacing.md },
    standardCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.lg,
    },
    premiumCard: {
      backgroundColor: DesignColors.surface2,
      borderRadius: Radius.lg,
      borderWidth: 2,
      borderColor: DesignColors.primary,
      padding: Spacing.lg,
      gap: Spacing.lg,
      overflow: 'hidden',
      shadowColor: DesignColors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 15,
      elevation: 8,
    },
    premiumGlow: {
      position: 'absolute',
      top: -40,
      right: -40,
      width: 96,
      height: 96,
      borderRadius: Radius.pill,
      backgroundColor: `${DesignColors.primary}33`,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    tierBadgeStandard: {
      alignSelf: 'flex-start',
      backgroundColor: DesignColors.surface3,
      borderRadius: Radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginBottom: Spacing.sm,
    },
    tierBadgeText: {
      ...Typography.mono,
      fontSize: 11,
      textTransform: 'uppercase',
      color: DesignColors.inkSubtle,
    },
    tierBadgePremium: {
      alignSelf: 'flex-start',
      backgroundColor: DesignColors.primary,
      borderRadius: Radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginBottom: Spacing.sm,
    },
    tierBadgePremiumText: {
      ...Typography.mono,
      fontSize: 11,
      textTransform: 'uppercase',
      color: DesignColors.onPrimary,
    },
    planTitle: { ...Typography.cardTitle, fontSize: 18, color: DesignColors.ink },
    currentPlan: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    currentPlanText: { ...Typography.mono, fontSize: 11, color: DesignColors.primary },
    priceBlock: { alignItems: 'flex-end' },
    price: { fontSize: 20, fontWeight: '700', color: DesignColors.primary, lineHeight: 22 },
    pricePeriod: { ...Typography.mono, fontSize: 11, color: DesignColors.inkSubtle },
    featureList: { gap: Spacing.sm },
    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    featureTextStandard: { ...Typography.bodySm, flex: 1, color: DesignColors.inkSubtle },
    featureTextPremium: { ...Typography.bodySm, flex: 1, color: DesignColors.ink },
    disabledButton: {
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      borderRadius: Radius.md,
      backgroundColor: DesignColors.surface3,
      paddingVertical: 10,
      alignItems: 'center',
    },
    disabledButtonText: {
      ...Typography.button,
      color: DesignColors.inkSubtle,
    },
    upgradeButton: {
      backgroundColor: DesignColors.primary,
      borderRadius: Radius.md,
      paddingVertical: 14,
      alignItems: 'center',
    },
    upgradeDisabled: { opacity: 0.6 },
    upgradePressed: { opacity: 0.9 },
    upgradeButtonText: {
      ...Typography.button,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: DesignColors.onPrimary,
    },
  });
