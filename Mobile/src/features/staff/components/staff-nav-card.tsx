import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useDesignColors } from '@/hooks/use-design-colors';

type StaffNavCardProps = {
  title: string;
  meta: string;
  href: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function StaffNavCard({ title, meta, href, icon = 'chevron-forward' }: StaffNavCardProps) {
  const router = useRouter();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);

  return (
    <Pressable
      onPress={() => router.push(href as never)}
      style={({ pressed }) => [styles.navCard, pressed && styles.navCardPressed]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText style={styles.navCardTitle}>{title}</ThemedText>
          <ThemedText style={styles.navCardMeta}>{meta}</ThemedText>
        </View>
        <Ionicons color={DesignColors.inkSubtle} name={icon} size={18} />
      </View>
    </Pressable>
  );
}
