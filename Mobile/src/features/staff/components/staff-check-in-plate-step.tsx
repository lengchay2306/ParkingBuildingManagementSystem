import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { StaffPlateScannerModal } from '@/features/staff/components/staff-plate-scanner-modal';
import { StaffScreenHeader } from '@/features/staff/components/premium';
import { useDesignColors } from '@/hooks/use-design-colors';

type StaffCheckInPlateStepProps = {
  plateQuery: string;
  isSearching: boolean;
  onPlateChange: (value: string) => void;
  onSearch: () => void;
  onPlateScanned: (plate: string) => void;
  t: (vi: string, en: string) => string;
};

export function StaffCheckInPlateStep({
  plateQuery,
  isSearching,
  onPlateChange,
  onSearch,
  onPlateScanned,
  t,
}: StaffCheckInPlateStepProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [scannerVisible, setScannerVisible] = useState(false);

  return (
    <View style={styles.root}>
      <StaffScreenHeader
        subtitle={t('Nhập hoặc quét biển số để bắt đầu', 'Enter or scan a plate to begin')}
        title={t('Check-in', 'Check-in')}
      />

      <View style={styles.card}>
        <ThemedText style={styles.label}>{t('Biển số xe', 'License plate')}</ThemedText>
        <View style={styles.plateRow}>
          <TextInput
            autoCapitalize="characters"
            editable={!isSearching}
            onChangeText={onPlateChange}
            onSubmitEditing={onSearch}
            placeholder="51A-123.45"
            placeholderTextColor={DesignColors.placeholder}
            returnKeyType="search"
            style={[styles.input, styles.plateInput]}
            value={plateQuery}
          />
          <Pressable
            disabled={isSearching}
            onPress={onSearch}
            style={({ pressed }) => [styles.searchBtn, pressed && styles.btnPressed]}>
            {isSearching ? (
              <ActivityIndicator color={DesignColors.onPrimary} size="small" />
            ) : (
              <Ionicons color={DesignColors.onPrimary} name="search" size={20} />
            )}
          </Pressable>
        </View>
      </View>

      <Pressable
        disabled={isSearching}
        onPress={() => setScannerVisible(true)}
        style={({ pressed }) => [styles.scanCard, pressed && styles.btnPressed]}>
        <View style={styles.scanIconWrap}>
          <Ionicons color={DesignColors.primaryFocus} name="scan-outline" size={36} />
        </View>
        <View style={styles.scanTextBlock}>
          <ThemedText style={styles.scanTitle}>{t('Quét biển số xe', 'Scan license plate')}</ThemedText>
          <ThemedText style={styles.scanSubtitle}>
            {t('Dùng camera để nhận diện biển số tự động', 'Use the camera for automatic plate recognition')}
          </ThemedText>
        </View>
        <Ionicons color={DesignColors.inkSubtle} name="chevron-forward" size={22} />
      </Pressable>

      <StaffPlateScannerModal
        onClose={() => setScannerVisible(false)}
        onPlateDetected={(plate) => {
          setScannerVisible(false);
          onPlateScanned(plate);
        }}
        t={t}
        visible={scannerVisible}
      />
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    root: {
      gap: Spacing.lg,
    },
    card: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    label: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.9,
      fontSize: 10,
      fontWeight: '600',
    },
    plateRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: Spacing.sm,
    },
    input: {
      ...Typography.body,
      flex: 1,
      color: DesignColors.ink,
      backgroundColor: DesignColors.surface3,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      paddingHorizontal: Spacing.md,
      height: 52,
    },
    plateInput: {
      ...Typography.mono,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    searchBtn: {
      width: 52,
      height: 52,
      borderRadius: Radius.lg,
      backgroundColor: DesignColors.primaryFocus,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: `${DesignColors.primaryFocus}44`,
      padding: Spacing.lg,
    },
    scanIconWrap: {
      width: 64,
      height: 64,
      borderRadius: Radius.lg,
      backgroundColor: `${DesignColors.primaryFocus}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanTextBlock: {
      flex: 1,
      gap: 4,
    },
    scanTitle: {
      ...Typography.body,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 16,
    },
    scanSubtitle: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    btnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
  });
}
