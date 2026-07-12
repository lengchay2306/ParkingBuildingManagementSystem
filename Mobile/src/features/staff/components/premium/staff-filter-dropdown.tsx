import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import type { StaffFilterOption } from '@/features/staff/components/premium/staff-filter-pills';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { StaffPressableScale } from '@/features/staff/motion/staff-motion';

type StaffFilterDropdownProps<T extends string> = {
  label: string;
  options: StaffFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Shown when nothing is selected / options empty. */
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
};

export function StaffFilterDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  emptyText,
}: StaffFilterDropdownProps<T>) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => option.id === value);
  const triggerLabel = selected?.label ?? placeholder ?? '—';

  function handleSelect(next: T) {
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <View style={styles.field}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <StaffPressableScale
          disabled={disabled}
          onPress={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          scaleTo={0.98}
          style={[styles.trigger, disabled && styles.triggerDisabled]}>
          <ThemedText
            numberOfLines={2}
            style={[styles.triggerText, !selected && styles.triggerPlaceholder]}>
            {triggerLabel}
          </ThemedText>
          <Ionicons color={DesignColors.inkSubtle} name="chevron-down" size={18} />
        </StaffPressableScale>
      </View>

      <Modal animationType="none" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
            <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          </Animated.View>

          <Animated.View
            entering={FadeIn.duration(280)}
            exiting={FadeOut.duration(200)}
            style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ThemedText style={styles.sheetTitle}>{label}</ThemedText>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.optionList}>
              {options.length === 0 ? (
                <ThemedText style={styles.emptyText}>
                  {emptyText ?? '—'}
                </ThemedText>
              ) : (
                options.map((option, index) => {
                  const active = option.id === value;
                  return (
                    <Animated.View entering={FadeIn.delay(index * 30).duration(220)} key={option.id}>
                      <Pressable
                        onPress={() => handleSelect(option.id)}
                        style={({ pressed }) => [
                          styles.option,
                          active && styles.optionActive,
                          pressed && styles.optionPressed,
                        ]}>
                        <ThemedText style={[styles.optionText, active && styles.optionTextActive]}>
                          {option.label}
                        </ThemedText>
                        {active ? (
                          <Ionicons color={DesignColors.primary} name="checkmark-circle" size={20} />
                        ) : null}
                      </Pressable>
                    </Animated.View>
                  );
                })
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

type StaffFilterDropdownRowProps = {
  children: React.ReactNode;
};

export function StaffFilterDropdownRow({ children }: StaffFilterDropdownRowProps) {
  const styles = useMemo(() => gridStyles, []);

  return <View style={styles.grid}>{children}</View>;
}

type StaffFilterDropdownCellProps = {
  children: React.ReactNode;
  index?: number;
};

export function StaffFilterDropdownCell({ children }: StaffFilterDropdownCellProps) {
  return <View style={gridStyles.cell}>{children}</View>;
}

const gridStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cell: {
    width: '48%',
    flexGrow: 1,
  },
});

function createStyles(DesignColors: ReturnType<typeof useStaffDesignColors>) {
  return StyleSheet.create({
    field: {
      gap: 6,
    },
    label: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
      fontSize: 10,
      fontWeight: '600',
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.sm,
      minHeight: 48,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface1,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
    },
    triggerText: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '600',
      flex: 1,
    },
    triggerDisabled: {
      opacity: 0.55,
    },
    triggerPlaceholder: {
      color: DesignColors.inkSubtle,
      fontWeight: '500',
    },
    emptyText: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
      paddingVertical: Spacing.lg,
      textAlign: 'center',
    },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    sheet: {
      backgroundColor: DesignColors.surface1,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      borderBottomWidth: 0,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.xl,
      maxHeight: '62%',
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.hairlineStrong,
      marginTop: Spacing.sm,
      marginBottom: Spacing.md,
    },
    sheetTitle: {
      ...Typography.cardTitle,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 17,
      marginBottom: Spacing.sm,
    },
    optionList: {
      flexGrow: 0,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      borderRadius: Radius.lg,
      paddingHorizontal: Spacing.md,
      marginBottom: 4,
    },
    optionActive: {
      backgroundColor: `${DesignColors.primary}14`,
    },
    optionPressed: {
      opacity: 0.88,
    },
    optionText: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
      fontWeight: '500',
      flex: 1,
    },
    optionTextActive: {
      color: DesignColors.primary,
      fontWeight: '700',
    },
  });
}
