import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import type { MonthlyCardRef, UserVehicle } from '@/lib/auth-api';

function formatDate(value: string | Date | undefined) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function vehicleStatusTone(
  status: string | undefined,
  DesignColors: DesignColorPalette,
  t: (vi: string, en: string) => string,
) {
  const normalized = status?.toUpperCase();
  if (normalized === 'ACTIVE') {
    return { label: t('Hoạt động', 'Active'), color: DesignColors.semanticSuccess };
  }
  if (normalized === 'EXPIRED') {
    return { label: t('Hết hạn', 'Expired'), color: DesignColors.inkMuted };
  }
  if (normalized === 'LOCKED') {
    return { label: t('Đã khóa', 'Locked'), color: DesignColors.semanticDanger };
  }
  if (normalized === 'INACTIVE') {
    return { label: t('Ngưng', 'Inactive'), color: DesignColors.inkSubtle };
  }
  return { label: status ?? '—', color: DesignColors.inkSubtle };
}

function resolveMonthlyCard(card: UserVehicle['monthlyCardId']): MonthlyCardRef | null {
  if (!card) {
    return null;
  }
  if (typeof card === 'string') {
    return { _id: card };
  }
  return card;
}

export type VehicleCardStyles = {
  vehicleCard: ViewStyle;
  vehicleHeader: ViewStyle;
  plateBadge: ViewStyle;
  plateText: TextStyle;
  vehicleHeaderActions: ViewStyle;
  vehicleActionButton: ViewStyle;
  buttonPressed: ViewStyle;
  statusPill: ViewStyle;
  statusPillText: TextStyle;
  infoRow: ViewStyle;
  infoLabel: TextStyle;
  infoValue: TextStyle;
  infoValueMono: TextStyle;
  noCardText: TextStyle;
};

export function VehicleCard({
  vehicle,
  t,
  styles,
  DesignColors,
  onEdit,
  onDelete,
  onBuyMonthlyCard,
  isDeleting,
  isBuyingMonthlyCard,
}: {
  vehicle: UserVehicle;
  t: (vi: string, en: string) => string;
  styles: VehicleCardStyles & {
    buyCardButton?: ViewStyle;
    buyCardButtonText?: TextStyle;
  };
  DesignColors: DesignColorPalette;
  onEdit: () => void;
  onDelete: () => void;
  onBuyMonthlyCard?: () => void;
  isDeleting: boolean;
  isBuyingMonthlyCard?: boolean;
}) {
  const local = useMemo(() => createLocalStyles(DesignColors), [DesignColors]);
  const card = resolveMonthlyCard(vehicle.monthlyCardId);
  const vehicleType =
    typeof vehicle.vehicleTypeId === 'object' && vehicle.vehicleTypeId?.type
      ? vehicle.vehicleTypeId.type
      : '—';
  const vehicleStatus = vehicleStatusTone(vehicle.status, DesignColors, t);
  const hasCard = Boolean(card);
  const cardNormalized = card?.status?.toUpperCase();
  const isCardExpired = cardNormalized === 'EXPIRED';
  const endLabel = formatDate(card?.endDate);

  const ribbonAccent = isCardExpired
    ? DesignColors.inkMuted
    : cardNormalized === 'LOCKED'
      ? DesignColors.semanticDanger
      : DesignColors.primary;

  const ribbonLabel = isCardExpired
    ? t('HẾT', 'END')
    : cardNormalized === 'LOCKED'
      ? t('KHÓA', 'LOCK')
      : t('THẺ', 'PASS');

  return (
    <View style={[styles.vehicleCard, local.cardRoot]}>
      {hasCard ? (
        <View
          style={local.ribbonCorner}
          pointerEvents="none"
          accessibilityLabel={
            endLabel
              ? t(`Thẻ tháng đến ${endLabel}`, `Monthly pass until ${endLabel}`)
              : t('Thẻ tháng', 'Monthly pass')
          }
        >
          <View style={[local.ribbonBand, { backgroundColor: ribbonAccent }]}>
            <ThemedText style={local.ribbonText}>{ribbonLabel}</ThemedText>
          </View>
        </View>
      ) : null}

      <View style={styles.vehicleHeader}>
        <View style={styles.plateBadge}>
          <ThemedText style={styles.plateText}>{vehicle.licensePlate}</ThemedText>
        </View>
        <View style={[styles.vehicleHeaderActions, hasCard && local.headerActionsWithRibbon]}>
          <Pressable
            onPress={onEdit}
            disabled={isDeleting || isBuyingMonthlyCard}
            style={({ pressed }) => [styles.vehicleActionButton, pressed && styles.buttonPressed]}
            accessibilityLabel={t('Sửa xe', 'Edit vehicle')}
          >
            <Ionicons name="create-outline" size={16} color={DesignColors.primary} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            disabled={isDeleting || isBuyingMonthlyCard}
            style={({ pressed }) => [styles.vehicleActionButton, pressed && styles.buttonPressed]}
            accessibilityLabel={t('Xóa xe', 'Delete vehicle')}
          >
            {isDeleting ? (
              <ActivityIndicator color={DesignColors.inkMuted} size="small" />
            ) : (
              <Ionicons name="trash-outline" size={16} color={DesignColors.inkMuted} />
            )}
          </Pressable>
          <View style={[styles.statusPill, { borderColor: vehicleStatus.color }]}>
            <ThemedText style={[styles.statusPillText, { color: vehicleStatus.color }]}>
              {vehicleStatus.label}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <ThemedText style={styles.infoLabel}>{t('Loại xe', 'Vehicle type')}</ThemedText>
        <ThemedText style={styles.infoValue}>{vehicleType}</ThemedText>
      </View>

      {hasCard ? (
        <ThemedText style={local.expiryHint}>
          {endLabel
            ? t(`Thẻ tháng có hiệu lực đến: ${endLabel}`, `Monthly pass valid until: ${endLabel}`)
            : t('Thẻ tháng đang gắn với xe', 'Monthly pass linked to this vehicle')}
        </ThemedText>
      ) : null}

      {!hasCard ? (
        <>
          <ThemedText style={styles.noCardText}>
            {t('Chưa có thẻ tháng', 'No monthly card linked')}
          </ThemedText>
          {onBuyMonthlyCard ? (
            <Pressable
              onPress={onBuyMonthlyCard}
              disabled={isBuyingMonthlyCard}
              style={({ pressed }) => [
                styles.buyCardButton,
                pressed && styles.buttonPressed,
                { backgroundColor: DesignColors.primary },
              ]}
            >
              {isBuyingMonthlyCard ? (
                <ActivityIndicator color={DesignColors.onPrimary} size="small" />
              ) : (
                <ThemedText style={[styles.buyCardButtonText, { color: DesignColors.onPrimary }]}>
                  {t('Mua thẻ tháng', 'Buy monthly card')}
                </ThemedText>
              )}
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const createLocalStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    cardRoot: {
      position: 'relative',
      overflow: 'hidden',
    },
    /** Top-right corner clip — classic product sale ribbon */
    ribbonCorner: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 64,
      height: 64,
      overflow: 'hidden',
      zIndex: 2,
    },
    ribbonBand: {
      position: 'absolute',
      top: 10,
      right: -22,
      width: 88,
      paddingVertical: 3,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ rotate: '45deg' }],
    },
    ribbonText: {
      ...Typography.caption,
      color: DesignColors.onPrimary,
      fontWeight: '800',
      fontSize: 9,
      lineHeight: 11,
      letterSpacing: 0.8,
    },
    headerActionsWithRibbon: {
      paddingRight: 28,
    },
    expiryHint: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      marginTop: 2,
    },
  });
