import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { StaffLoadingLottie } from '@/features/staff/components/staff-loading-lottie';
import { StaffSlideSheet } from '@/features/staff/components/staff-slide-sheet';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import {
  getManualPlateValidationError,
  LICENSE_PLATE_EXAMPLE,
} from '@/features/staff/lib/license-plate-ocr';
import { StaffFadeIn } from '@/features/staff/motion/staff-motion';

type StaffCheckInManualSheetProps = {
  visible: boolean;
  plateQuery: string;
  isSearching: boolean;
  onClose: () => void;
  onPlateChange: (value: string) => void;
  onSearch: () => void;
  t: (vi: string, en: string) => string;
};

export function StaffCheckInManualSheet({
  visible,
  plateQuery,
  isSearching,
  onClose,
  onPlateChange,
  onSearch,
  t,
}: StaffCheckInManualSheetProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const plateError = getManualPlateValidationError(plateQuery, t);
  const searchDisabled = isSearching || !!plateError || !plateQuery.trim();

  return (
    <StaffSlideSheet
      alignAboveTabBar
      maxHeightRatio={0.72}
      subtitle={t('Nhập biển số khi không quét được QR', 'Enter plate when QR scan fails')}
      title={t('Nhập biển số thủ công', 'Enter plate manually')}
      visible={visible}
      onClose={onClose}>
      <StaffFadeIn delay={40}>
        <View style={styles.card}>
          <ThemedText style={styles.label}>{t('Biển số xe', 'License plate')}</ThemedText>
          <View style={styles.plateRow}>
            <TextInput
              autoCapitalize="characters"
              autoFocus={visible}
              editable={!isSearching}
              onChangeText={onPlateChange}
              onSubmitEditing={() => {
                if (!searchDisabled) {
                  onSearch();
                }
              }}
              placeholder={LICENSE_PLATE_EXAMPLE}
              placeholderTextColor={DesignColors.placeholder}
              returnKeyType="search"
              style={[styles.input, styles.plateInput, plateError ? styles.inputError : null]}
              value={plateQuery}
            />
            <Pressable
              disabled={searchDisabled}
              onPress={onSearch}
              style={({ pressed }) => [
                styles.searchBtn,
                searchDisabled && styles.searchBtnDisabled,
                pressed && !searchDisabled && styles.btnPressed,
              ]}>
              {isSearching ? (
                <StaffLoadingLottie animate={false} size={32} />
              ) : (
                <Ionicons color={DesignColors.onPrimary} name="search" size={20} />
              )}
            </Pressable>
          </View>
          <ThemedText style={[styles.hint, plateError ? styles.hintError : null]}>
            {plateError ??
              t(`Định dạng: ${LICENSE_PLATE_EXAMPLE}`, `Format: ${LICENSE_PLATE_EXAMPLE}`)}
          </ThemedText>
        </View>
      </StaffFadeIn>
    </StaffSlideSheet>
  );
}

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    card: {
      gap: Spacing.sm,
      paddingBottom: Spacing.md,
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
    inputError: {
      borderColor: DesignColors.semanticDanger,
    },
    searchBtn: {
      width: 52,
      height: 52,
      borderRadius: Radius.lg,
      backgroundColor: DesignColors.primaryFocus,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBtnDisabled: {
      opacity: 0.45,
    },
    hint: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 11,
    },
    hintError: {
      color: DesignColors.semanticDanger,
    },
    btnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
  });
}
