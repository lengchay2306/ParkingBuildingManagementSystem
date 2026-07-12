import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { CUSTOMER_ROUTES } from '@/roles';

/**
 * Shown after PayOS cancel redirect: mobile://payment/cancel?...
 */
export default function PaymentCancelPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const params = useLocalSearchParams<{ orderCode?: string }>();

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="close-circle" size={48} color={DesignColors.semanticDanger} />
        </View>

        <ThemedText style={styles.title}>{t('Đã hủy thanh toán', 'Payment cancelled')}</ThemedText>
        <ThemedText style={styles.body}>
          {t(
            'Bạn đã hủy giao dịch trên PayOS. Thẻ tháng chưa được kích hoạt. Có thể thử lại từ Hồ sơ.',
            'You cancelled the PayOS checkout. The monthly card was not activated. You can try again from Profile.',
          )}
        </ThemedText>
        {params.orderCode ? (
          <ThemedText style={styles.meta}>
            {t('Mã đơn', 'Order')}: {params.orderCode}
          </ThemedText>
        ) : null}

        <Pressable
          onPress={() => router.replace(CUSTOMER_ROUTES.profile as never)}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
          <ThemedText style={styles.primaryBtnText}>
            {t('Về hồ sơ — thử lại', 'Back to profile — try again')}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => router.replace(CUSTOMER_ROUTES.home as never)}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
          <ThemedText style={styles.secondaryBtnText}>{t('Về trang chủ', 'Back to home')}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function createStyles(DesignColors: DesignColorPalette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: DesignColors.canvas,
      paddingHorizontal: Spacing.lg,
      justifyContent: 'center',
    },
    card: {
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      padding: Spacing.xl,
      gap: Spacing.md,
      alignItems: 'center',
    },
    iconWrap: {
      width: 88,
      height: 88,
      borderRadius: Radius.xxl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: Spacing.xs,
      backgroundColor: `${DesignColors.semanticDanger}18`,
    },
    title: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      textAlign: 'center',
    },
    body: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    meta: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontFamily: 'monospace',
    },
    primaryBtn: {
      marginTop: Spacing.sm,
      alignSelf: 'stretch',
      minHeight: 48,
      borderRadius: Radius.lg,
      backgroundColor: DesignColors.primaryFocus,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryBtnText: {
      ...Typography.button,
      color: DesignColors.onPrimary,
      fontWeight: '700',
    },
    secondaryBtn: {
      alignSelf: 'stretch',
      minHeight: 44,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryBtnText: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '600',
    },
    pressed: {
      opacity: 0.88,
    },
  });
}
