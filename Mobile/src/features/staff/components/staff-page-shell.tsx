import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth } from '@/constants/theme';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useDesignColors } from '@/hooks/use-design-colors';

type StaffPageShellProps = {
  header?: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

export function StaffPageShell({
  header,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  contentStyle,
}: StaffPageShellProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[shellStyles.content, footer ? shellStyles.contentWithFooter : null, contentStyle]}
        showsVerticalScrollIndicator={false}>
        {header ??
          (title ? (
            <View style={styles.header}>
              {eyebrow ? <ThemedText style={styles.eyebrow}>{eyebrow}</ThemedText> : null}
              <ThemedText style={styles.title}>{title}</ThemedText>
              {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
            </View>
          ) : null)}
        {children}
      </ScrollView>
      {footer}
    </ThemedView>
  );
}

const shellStyles = StyleSheet.create({
  content: {
    gap: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  contentWithFooter: {
    paddingBottom: 100,
  },
});
