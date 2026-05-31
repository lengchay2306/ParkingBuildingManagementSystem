import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

type PhotoCaptureSlotProps = {
  label: string;
  hint: string;
  imageUri?: string | null;
  required?: boolean;
  aspectRatio?: number;
  showScanOverlay?: boolean;
  recognized?: boolean;
  onPress: () => void;
};

export function PhotoCaptureSlot({
  label,
  hint,
  imageUri,
  required,
  aspectRatio = 16 / 9,
  showScanOverlay,
  recognized,
  onPress,
}: PhotoCaptureSlotProps) {
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showScanOverlay || !imageUri) {
      scanAnim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [imageUri, scanAnim, showScanOverlay]);

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        {required ? (
          <View style={styles.requiredBadge}>
            <ThemedText style={styles.requiredText}>{t('BẮT BUỘC', 'REQUIRED')}</ThemedText>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.slot,
          { aspectRatio },
          !imageUri && styles.slotEmpty,
          pressed && styles.slotPressed,
        ]}
      >
        {imageUri ? (
          <>
            <Image contentFit="cover" source={{ uri: imageUri }} style={styles.image} />
            {showScanOverlay ? (
              <View pointerEvents="none" style={styles.overlay}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanTranslate }] }]} />
              </View>
            ) : null}
            {recognized ? (
              <View style={styles.recognizedBadge}>
                <View style={styles.recognizedDot} />
                <ThemedText style={styles.recognizedText}>
                  {t('Đã nhận diện', 'Recognized')}
                </ThemedText>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.placeholder}>
            <Ionicons color={DesignColors.primary} name="camera" size={32} />
            <ThemedText style={styles.hint}>{hint}</ThemedText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    section: { gap: Spacing.sm },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    label: {
      ...Typography.mono,
      fontSize: 12,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: DesignColors.inkSubtle,
    },
    requiredBadge: {
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: `${DesignColors.primary}33`,
      backgroundColor: `${DesignColors.primary}1A`,
      paddingHorizontal: Spacing.xs,
      paddingVertical: 2,
    },
    requiredText: {
      ...Typography.mono,
      fontSize: 10,
      color: DesignColors.primary,
    },
    slot: {
      borderRadius: Radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      backgroundColor: DesignColors.surface1,
    },
    slotEmpty: {
      borderStyle: 'dashed',
      backgroundColor: `${DesignColors.surface1}80`,
    },
    slotPressed: { opacity: 0.9 },
    image: { width: '100%', height: '100%' },
    placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, padding: Spacing.lg },
    hint: {
      ...Typography.mono,
      fontSize: 11,
      color: DesignColors.inkSubtle,
      textAlign: 'center',
    },
    overlay: { ...StyleSheet.absoluteFillObject },
    corner: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderColor: DesignColors.primary,
    },
    cornerTL: { top: Spacing.md, left: Spacing.md, borderTopWidth: 2, borderLeftWidth: 2 },
    cornerTR: { top: Spacing.md, right: Spacing.md, borderTopWidth: 2, borderRightWidth: 2 },
    cornerBL: { bottom: Spacing.md, left: Spacing.md, borderBottomWidth: 2, borderLeftWidth: 2 },
    cornerBR: { bottom: Spacing.md, right: Spacing.md, borderBottomWidth: 2, borderRightWidth: 2 },
    scanLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: DesignColors.primary,
      opacity: 0.8,
    },
    recognizedBadge: {
      position: 'absolute',
      top: Spacing.md,
      right: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#00000099',
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: `${DesignColors.primary}4D`,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 4,
    },
    recognizedDot: {
      width: 6,
      height: 6,
      borderRadius: Radius.pill,
      backgroundColor: DesignColors.primary,
    },
    recognizedText: {
      ...Typography.mono,
      fontSize: 9,
      textTransform: 'uppercase',
      color: DesignColors.primary,
    },
  });
