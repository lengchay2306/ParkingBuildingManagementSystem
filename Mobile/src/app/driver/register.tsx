import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppToast } from '@/components/app-toast';
import { DriverAppBar } from '@/components/driver/driver-app-bar';
import { PhotoCaptureSlot } from '@/components/driver/photo-capture-slot';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DesignColorPalette, Radius, Spacing, Typography } from '@/constants/design';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';
import { usePhotoCapture } from '@/hooks/use-photo-capture';

/** ng_k_ph_ng_ti_n_full_document_scan — vehicle registration with photo capture */
export default function DriverRegisterVehicleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useAppToast();
  const { pickPhoto } = usePhotoCapture();
  const DesignColors = useDesignColors();
  const { t } = useLanguagePreference();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const [plateImage, setPlateImage] = useState<string | null>(null);
  const [docFrontImage, setDocFrontImage] = useState<string | null>(null);
  const [docBackImage, setDocBackImage] = useState<string | null>(null);
  const [extractedPlate, setExtractedPlate] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [color, setColor] = useState('');
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePlateCapture = async () => {
    const result = await pickPhoto(true);
    if (result.cancelled) {
      return;
    }

    setPlateImage(result.uri);
    setScanning(true);
    setExtractedPlate('');

    // Mock OCR — replace with backend plate recognition when API is ready.
    setTimeout(() => {
      setExtractedPlate('30A-123.45');
      setScanning(false);
    }, 1200);
  };

  const handleDocFrontCapture = async () => {
    const result = await pickPhoto(true);
    if (!result.cancelled) {
      setDocFrontImage(result.uri);
    }
  };

  const handleDocBackCapture = async () => {
    const result = await pickPhoto(true);
    if (!result.cancelled) {
      setDocBackImage(result.uri);
    }
  };

  const canSubmit = Boolean(plateImage && extractedPlate && makeModel.trim() && color.trim());

  const handleSubmit = async () => {
    if (!canSubmit) {
      showToast(
        t('Vui lòng chụp biển số và điền đầy đủ thông tin.', 'Please capture the plate and fill in all fields.'),
        'error',
      );
      return;
    }

    setSubmitting(true);
    try {
      // TODO: POST vehicle registration with images when backend endpoint is available.
      await new Promise((resolve) => setTimeout(resolve, 800));
      showToast(t('Đăng ký phương tiện thành công.', 'Vehicle registered successfully.'), 'success');
      router.back();
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('Không thể đăng ký.', 'Registration failed.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <DriverAppBar showBack onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <ThemedText style={styles.title}>{t('Chụp ảnh phương tiện', 'Capture vehicle photos')}</ThemedText>
          <ThemedText style={styles.subtitle}>
            {t(
              'Vui lòng cung cấp hình ảnh rõ nét để hệ thống tự động nhận diện thông tin.',
              'Provide clear photos so the system can automatically recognize vehicle details.',
            )}
          </ThemedText>
        </View>

        <View style={styles.photos}>
          <PhotoCaptureSlot
            aspectRatio={4 / 3}
            hint={t('Chạm để chụp biển số', 'Tap to capture license plate')}
            imageUri={plateImage}
            label={t('1. Biển số xe', '1. License plate')}
            onPress={handlePlateCapture}
            recognized={Boolean(extractedPlate)}
            required
            showScanOverlay
          />

          <PhotoCaptureSlot
            aspectRatio={16 / 9}
            hint={t('Chạm để chụp mặt trước', 'Tap to capture front side')}
            imageUri={docFrontImage}
            label={t('2. Giấy tờ xe - Mặt trước', '2. Vehicle document — Front')}
            onPress={handleDocFrontCapture}
          />

          <PhotoCaptureSlot
            aspectRatio={16 / 9}
            hint={t('Chạm để chụp mặt sau', 'Tap to capture back side')}
            imageUri={docBackImage}
            label={t('3. Giấy tờ xe - Mặt sau', '3. Vehicle document — Back')}
            onPress={handleDocBackCapture}
          />
        </View>

        <View style={styles.extractSection}>
          <View style={styles.extractHeader}>
            <Ionicons color={DesignColors.primary} name="analytics-outline" size={20} />
            <ThemedText style={styles.extractTitle}>{t('Trích xuất dữ liệu', 'Extracted data')}</ThemedText>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText style={styles.fieldLabel}>
              {t('Biển số xe (Tự động)', 'License plate (Auto)')}
            </ThemedText>
            <View style={styles.readonlyField}>
              {scanning ? (
                <ActivityIndicator color={DesignColors.primary} size="small" />
              ) : (
                <>
                  <ThemedText style={styles.plateValue}>
                    {extractedPlate || t('Chưa nhận diện', 'Not recognized yet')}
                  </ThemedText>
                  {extractedPlate ? (
                    <Ionicons color={DesignColors.primary} name="checkmark-circle" size={18} />
                  ) : null}
                </>
              )}
            </View>
            <ThemedText style={styles.fieldHint}>
              {t(
                'Dữ liệu được trích xuất từ ảnh trên (không thể chỉnh sửa)',
                'Data extracted from the photo above (read-only)',
              )}
            </ThemedText>
          </View>

          <View style={styles.manualCard}>
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>{t('Hãng & Dòng xe', 'Make & model')}</ThemedText>
              <TextInput
                placeholder={t('ví dụ: Toyota Camry', 'e.g. Toyota Camry')}
                placeholderTextColor={DesignColors.inkSubtle}
                style={styles.input}
                value={makeModel}
                onChangeText={setMakeModel}
              />
            </View>
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>{t('Màu sắc', 'Color')}</ThemedText>
              <TextInput
                placeholder={t('ví dụ: Đen', 'e.g. Black')}
                placeholderTextColor={DesignColors.inkSubtle}
                style={styles.input}
                value={color}
                onChangeText={setColor}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Pressable
          disabled={submitting || !canSubmit}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            (!canSubmit || submitting) && styles.submitDisabled,
            pressed && canSubmit && !submitting && styles.submitPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={DesignColors.onPrimary} />
          ) : (
            <>
              <ThemedText style={styles.submitText}>{t('Hoàn tất đăng ký', 'Complete registration')}</ThemedText>
              <Ionicons color={DesignColors.onPrimary} name="checkmark-circle" size={18} />
            </>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const createStyles = (DesignColors: DesignColorPalette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: DesignColors.canvas },
    content: { padding: Spacing.md, gap: Spacing.xl },
    intro: { gap: Spacing.xs },
    title: { fontSize: 24, fontWeight: '600', color: DesignColors.ink },
    subtitle: { ...Typography.bodySm, color: DesignColors.inkSubtle },
    photos: { gap: Spacing.xl },
    extractSection: {
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
      paddingTop: Spacing.xl,
      gap: Spacing.lg,
    },
    extractHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    extractTitle: { ...Typography.cardTitle, fontSize: 20, color: DesignColors.ink },
    fieldGroup: { gap: Spacing.xs },
    fieldLabel: {
      ...Typography.mono,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: DesignColors.inkSubtle,
    },
    readonlyField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: `${DesignColors.primary}66`,
      borderRadius: Radius.sm,
      backgroundColor: DesignColors.surface1,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      minHeight: 48,
    },
    plateValue: {
      ...Typography.cardTitle,
      fontSize: 20,
      color: DesignColors.primary,
      letterSpacing: 1,
    },
    fieldHint: {
      ...Typography.bodySm,
      fontSize: 11,
      fontStyle: 'italic',
      color: DesignColors.inkSubtle,
      opacity: 0.8,
    },
    manualCard: {
      backgroundColor: `${DesignColors.surface1}80`,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: Spacing.md,
      gap: Spacing.md,
    },
    input: {
      ...Typography.body,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      borderRadius: Radius.sm,
      backgroundColor: DesignColors.surface1,
      color: DesignColors.ink,
      paddingHorizontal: Spacing.md,
      paddingVertical: 10,
    },
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderTopWidth: 1,
      borderTopColor: DesignColors.hairline,
      backgroundColor: DesignColors.canvas,
      paddingHorizontal: Spacing.md,
      paddingTop: Spacing.md,
    },
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xs,
      backgroundColor: DesignColors.primary,
      borderRadius: Radius.pill,
      height: 48,
    },
    submitDisabled: { opacity: 0.45 },
    submitPressed: { opacity: 0.9 },
    submitText: { ...Typography.button, fontWeight: '600', color: DesignColors.onPrimary },
  });
