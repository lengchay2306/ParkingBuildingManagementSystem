import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';

type StaffCheckInConfirmBarProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function StaffCheckInConfirmBar({
  label,
  onPress,
  disabled,
  loading,
  style,
}: StaffCheckInConfirmBarProps) {
  const DesignColors = useDesignColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(DesignColors, insets.bottom), [DesignColors, insets.bottom]);

  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          (disabled || loading) && styles.buttonDisabled,
          pressed && !disabled && !loading && styles.buttonPressed,
        ]}>
        {loading ? (
          <ActivityIndicator color={DesignColors.onPrimary} size="small" />
        ) : (
          <>
            <Ionicons color={DesignColors.onPrimary} name="checkmark-circle-outline" size={22} />
            <ThemedText style={styles.label}>{label}</ThemedText>
          </>
        )}
      </Pressable>
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>, bottomInset: number) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.sm,
      paddingBottom: Math.max(bottomInset, Spacing.md),
      backgroundColor: DesignColors.canvas,
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      minHeight: 56,
      borderRadius: Radius.xl,
      backgroundColor: DesignColors.primaryFocus,
      shadowColor: DesignColors.primaryFocus,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 14,
      elevation: 6,
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    buttonPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.99 }],
    },
    label: {
      ...Typography.button,
      color: DesignColors.onPrimary,
      fontWeight: '700',
      fontSize: 16,
      letterSpacing: 0.3,
    },
  });
}
