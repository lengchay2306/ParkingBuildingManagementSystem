import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { ActivityIndicator, Pressable, View, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette } from '@/constants/design';
import type { UserVehicle } from '@/lib/auth-api';

function formatDate(value: string | undefined) {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function statusTone(status: string | undefined, DesignColors: DesignColorPalette) {
  const normalized = status?.toUpperCase();
  if (normalized === 'ACTIVE') {
    return { label: normalized, color: DesignColors.semanticSuccess };
  }
  if (normalized === 'LOCKED') {
    return { label: normalized, color: '#ef4444' };
  }
  return { label: normalized ?? '—', color: DesignColors.inkSubtle };
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
  isDeleting,
}: {
  vehicle: UserVehicle;
  t: (vi: string, en: string) => string;
  styles: VehicleCardStyles;
  DesignColors: DesignColorPalette;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const card = vehicle.monthlyCardId;
  const vehicleType = vehicle.vehicleTypeId?.type ?? '—';
  const cardStatus = statusTone(card?.status, DesignColors);

  return (
    <View style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <View style={styles.plateBadge}>
          <ThemedText style={styles.plateText}>{vehicle.licensePlate}</ThemedText>
        </View>
        <View style={styles.vehicleHeaderActions}>
          <Pressable
            onPress={onEdit}
            disabled={isDeleting}
            style={({ pressed }) => [styles.vehicleActionButton, pressed && styles.buttonPressed]}
            accessibilityLabel={t('Sửa xe', 'Edit vehicle')}
          >
            <Ionicons name="create-outline" size={16} color={DesignColors.primary} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            disabled={isDeleting}
            style={({ pressed }) => [styles.vehicleActionButton, pressed && styles.buttonPressed]}
            accessibilityLabel={t('Xóa xe', 'Delete vehicle')}
          >
            {isDeleting ? (
              <ActivityIndicator color={DesignColors.inkMuted} size="small" />
            ) : (
              <Ionicons name="trash-outline" size={16} color={DesignColors.inkMuted} />
            )}
          </Pressable>
          <View style={[styles.statusPill, { borderColor: cardStatus.color }]}>
            <ThemedText style={[styles.statusPillText, { color: cardStatus.color }]}>
              {vehicle.status ?? '—'}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <ThemedText style={styles.infoLabel}>{t('Loại xe', 'Vehicle type')}</ThemedText>
        <ThemedText style={styles.infoValue}>{vehicleType}</ThemedText>
      </View>

      {card ? (
        <>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>{t('Thẻ tháng', 'Monthly card')}</ThemedText>
            <ThemedText style={styles.infoValueMono}>{card.cardCode ?? '—'}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>{t('Hiệu lực', 'Valid period')}</ThemedText>
            <ThemedText style={styles.infoValue}>
              {formatDate(card.startDate)} - {formatDate(card.endDate)}
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>{t('Trạng thái thẻ', 'Card status')}</ThemedText>
            <ThemedText style={[styles.infoValue, { color: cardStatus.color }]}>
              {card.status ?? '—'}
            </ThemedText>
          </View>
        </>
      ) : (
        <ThemedText style={styles.noCardText}>
          {t('Chưa có thẻ tháng', 'No monthly card linked')}
        </ThemedText>
      )}
    </View>
  );
}
