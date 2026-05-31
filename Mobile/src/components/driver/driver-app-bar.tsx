import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useThemePreference } from '@/hooks/theme-preference';

type DriverAppBarProps = {
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
};

export function DriverAppBar({ showBack, onBack, title }: DriverAppBarProps) {
  const DesignColors = useDesignColors();
  const { resolvedScheme, setThemePreference } = useThemePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const toggleTheme = () => {
    setThemePreference(resolvedScheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        {showBack ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
            >
              <Ionicons color={DesignColors.ink} name="arrow-back" size={22} />
            </Pressable>
            {title ? <ThemedText style={styles.screenTitle}>{title}</ThemedText> : null}
          </>
        ) : (
          <>
            <Ionicons color={DesignColors.primary} name="car" size={22} />
            <ThemedText style={styles.brand}>PARKOS</ThemedText>
          </>
        )}
      </View>
      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          onPress={toggleTheme}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
        >
          <Ionicons
            color={DesignColors.ink}
            name={resolvedScheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={20}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
        >
          <Ionicons color={DesignColors.ink} name="notifications-outline" size={20} />
        </Pressable>
        <View style={styles.avatar}>
          <Ionicons color={DesignColors.primary} name="person" size={16} />
        </View>
      </View>
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 56,
      paddingHorizontal: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: DesignColors.hairline,
      backgroundColor: DesignColors.canvas,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    brand: {
      ...Typography.cardTitle,
      fontSize: 18,
      fontWeight: '700',
      color: DesignColors.primary,
      letterSpacing: -0.5,
    },
    screenTitle: {
      ...Typography.body,
      fontWeight: '700',
      color: DesignColors.ink,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xxs,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconPressed: {
      backgroundColor: DesignColors.surface1,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
