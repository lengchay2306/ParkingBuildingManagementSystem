import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth } from '@/constants/theme';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useDesignColors } from '@/hooks/use-design-colors';

type StaffPageShellProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

/** feature-card rhythm from DESIGN.md — canvas + surface-1 cards, eyebrow taxonomy. */
export function StaffPageShell({ eyebrow, title, subtitle, children }: StaffPageShellProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={shellStyles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          {eyebrow ? <ThemedText style={styles.eyebrow}>{eyebrow}</ThemedText> : null}
          <ThemedText style={styles.title}>{title}</ThemedText>
          {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
        </View>
        {children}
      </ScrollView>
    </ThemedView>
  );
}

const shellStyles = StyleSheet.create({
  content: {
    gap: 24,
    paddingHorizontal: 16,
    paddingVertical: 24,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
