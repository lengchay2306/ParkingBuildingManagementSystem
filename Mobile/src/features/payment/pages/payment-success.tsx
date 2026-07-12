import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { getMyProfile } from '@/lib/auth-api';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { CUSTOMER_ROUTES } from '@/roles';

type ActivationState = 'checking' | 'activated' | 'pending';

/**
 * Shown after PayOS success redirect: mobile://payment/return?...
 * Polls profile until monthly card appears (webhook may lag).
 */
export default function PaymentSuccessPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const params = useLocalSearchParams<{ orderCode?: string; status?: string }>();
  const [state, setState] = useState<ActivationState>('checking');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const profile = await getMyProfile();
        const hasCard = (profile.vehicles ?? []).some((vehicle) => {
          const card = vehicle.monthlyCardId;
          if (!card) return false;
          if (typeof card === 'object') {
            return Boolean(card._id) || card.status?.toUpperCase() === 'ACTIVE';
          }
          return true;
        });
        if (hasCard) {
          if (!cancelled) setState('activated');
          return;
        }
      } catch {
        // keep trying
      }

      if (cancelled) return;
      if (attempts >= 10) {
        setState('pending');
        return;
      }
      setTimeout(() => {
        void poll();
      }, 2000);
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, []);

  const title =
    state === 'activated'
      ? t('Thanh toán thành công', 'Payment successful')
      : state === 'pending'
        ? t('Đã nhận thanh toán', 'Payment received')
        : t('Đang xác nhận…', 'Confirming…');

  const body =
    state === 'activated'
      ? t('Thẻ tháng đã được kích hoạt trên xe của bạn.', 'Your monthly card is now active on your vehicle.')
      : state === 'pending'
        ? t(
            'PayOS đã thanh toán. Thẻ tháng có thể cần vài giây để kích hoạt — mở Hồ sơ và kéo để làm mới.',
            'PayOS payment went through. The card may take a few seconds — open Profile and pull to refresh.',
          )
        : t(
            'Đang chờ hệ thống kích hoạt thẻ tháng sau webhook PayOS.',
            'Waiting for the system to activate your monthly card after the PayOS webhook.',
          );

  return (
    <ThemedView style={[styles.root, { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.lg }]}>
      <View style={styles.card}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor:
                state === 'activated'
                  ? `${DesignColors.semanticSuccess}22`
                  : state === 'pending'
                    ? `${DesignColors.semanticWarning}22`
                    : `${DesignColors.primaryFocus}18`,
            },
          ]}>
          {state === 'checking' ? (
            <ActivityIndicator color={DesignColors.primaryFocus} size="large" />
          ) : (
            <Ionicons
              name={state === 'activated' ? 'checkmark-circle' : 'time-outline'}
              size={48}
              color={state === 'activated' ? DesignColors.semanticSuccess : DesignColors.semanticWarning}
            />
          )}
        </View>

        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.body}>{body}</ThemedText>
        {params.orderCode ? (
          <ThemedText style={styles.meta}>
            {t('Mã đơn', 'Order')}: {params.orderCode}
          </ThemedText>
        ) : null}

        <Pressable
          onPress={() => router.replace(CUSTOMER_ROUTES.profile as never)}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}>
          <ThemedText style={styles.primaryBtnText}>{t('Về hồ sơ', 'Back to profile')}</ThemedText>
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
