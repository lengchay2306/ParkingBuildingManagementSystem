import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { CUSTOMER_ROUTES } from '@/roles';

type Props = {
  t: (vi: string, en: string) => string;
  DesignColors: DesignColorPalette;
};

type Action = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  titleVi: string;
  titleEn: string;
  route: string;
  accent: 'primary' | 'success' | 'warning';
};

/** Quick shortcuts mirroring FE driver actions: reserve, map, session. */
export function CustomerHomeQrButton({ t, DesignColors }: Props) {
  const router = useRouter();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const actions: Action[] = [
    {
      key: 'reserve',
      icon: 'location-outline',
      titleVi: 'Đặt chỗ',
      titleEn: 'Reserve',
      route: CUSTOMER_ROUTES.reservations,
      accent: 'primary',
    },
    {
      key: 'map',
      icon: 'map-outline',
      titleVi: 'Bản đồ 3D',
      titleEn: '3D map',
      route: CUSTOMER_ROUTES.parkingMap,
      accent: 'success',
    },
    {
      key: 'session',
      icon: 'time-outline',
      titleVi: 'Phiên gửi',
      titleEn: 'Session',
      route: CUSTOMER_ROUTES.driver,
      accent: 'warning',
    },
  ];

  return (
    <View style={styles.row}>
      {actions.map((action) => {
        const accentColor =
          action.accent === 'success'
            ? DesignColors.semanticSuccess
            : action.accent === 'warning'
              ? DesignColors.semanticWarning
              : DesignColors.primary;

        return (
          <ScalePressable
            key={action.key}
            onPress={() => router.push(action.route as never)}
            style={styles.card}
            scaleTo={0.96}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
              <Ionicons name={action.icon} size={20} color={accentColor} />
            </View>
            <ThemedText style={styles.title}>{t(action.titleVi, action.titleEn)}</ThemedText>
          </ScalePressable>
        );
      })}
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    card: {
      flex: 1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface1,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xs,
      alignItems: 'center',
      gap: Spacing.xs,
      minHeight: 88,
      justifyContent: 'center',
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...Typography.caption,
      color: DesignColors.ink,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
