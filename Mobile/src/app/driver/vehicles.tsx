import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DriverAppBar } from '@/components/driver/driver-app-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

/** parkos_unified_app_final_fixed — MY VEHICLES TAB / ng_k_ph_ng_ti_n_full_document_scan */
export default function DriverVehiclesScreen() {
  const router = useRouter();
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  return (
    <ThemedView style={styles.container}>
      <DriverAppBar showBack onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={styles.title}>{t('Phương tiện của tôi', 'My Vehicles')}</ThemedText>

        <View style={styles.vehicleCard}>
          <View style={styles.vehicleRow}>
            <View style={styles.vehicleIcon}>
              <Ionicons color={DesignColors.inkSubtle} name="car" size={28} />
            </View>
            <View>
              <ThemedText style={styles.vehicleName}>Honda Civic</ThemedText>
              <ThemedText style={styles.plate}>XJK-4112</ThemedText>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/driver/register' as never)}
          style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]}
        >
          <Ionicons color={DesignColors.inkSubtle} name="add-circle-outline" size={28} />
          <ThemedText style={styles.addLabel}>
            {t('Đăng ký phương tiện mới', 'Register New Vehicle')}
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing.xl },
    title: { fontSize: 24, fontWeight: '700', color: DesignColors.ink },
    vehicleCard: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.lg,
    },
    vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    vehicleIcon: {
      width: 56,
      height: 56,
      borderRadius: Radius.lg,
      backgroundColor: DesignColors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vehicleName: { ...Typography.body, fontWeight: '700', fontSize: 18, color: DesignColors.ink },
    plate: {
      ...Typography.mono,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: DesignColors.inkSubtle,
    },
    addButton: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: DesignColors.hairline,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      alignItems: 'center',
      gap: Spacing.xs,
    },
    addPressed: { backgroundColor: DesignColors.surface1 },
    addLabel: {
      ...Typography.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: DesignColors.inkSubtle,
    },
  });
