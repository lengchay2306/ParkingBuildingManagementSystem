import Ionicons from '@expo/vector-icons/Ionicons';
import { useCameraPermissions } from 'expo-camera';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Typography } from '@/constants/design';
import {
  CHECKIN_CAMERA_BORDER_RADIUS,
  CHECKIN_VEHICLE_BODY_HEIGHT,
} from '@/features/staff/components/staff-check-in-layout';
import { StaffInlinePlateScanner } from '@/features/staff/components/staff-inline-plate-scanner';
import type { StaffVehicle } from '@/features/staff/api';
import { resolveVehicleTypeLabel } from '@/features/staff/api';
import { useDesignColors } from '@/hooks/use-design-colors';

const VEHICLE_BANNER_SLOT = 52;
const FIELD_GAP = 12;

type StaffCheckInVehicleSectionProps = {
  plateQuery: string;
  phone: string;
  foundVehicle: StaffVehicle | null;
  isSearching: boolean;
  isDisabled?: boolean;
  onPlateChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSearch: () => void;
  onPlateScanned: (plate: string) => void;
  t: (vi: string, en: string) => string;
};

export function StaffCheckInVehicleSection({
  plateQuery,
  phone,
  foundVehicle,
  isSearching,
  isDisabled,
  onPlateChange,
  onPhoneChange,
  onSearch,
  onPlateScanned,
  t,
}: StaffCheckInVehicleSectionProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const handleScanPress = useCallback(async () => {
    if (isDisabled || isSearching) {
      return;
    }

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setPermissionDenied(true);
        return;
      }
    }

    setPermissionDenied(false);
    setIsScanning(true);
  }, [isDisabled, isSearching, permission?.granted, requestPermission]);

  const handleScanCancel = useCallback(() => {
    setIsScanning(false);
  }, []);

  const handlePlateDetected = useCallback(
    (plate: string) => {
      setIsScanning(false);
      onPlateChange(plate);
      onPlateScanned(plate);
    },
    [onPlateChange, onPlateScanned],
  );

  return (
    <View style={styles.section}>
      <View style={styles.titleRow}>
        <ThemedText style={[styles.sectionTitle, isScanning && styles.titleHidden]}>
          {t('Thông tin xe & liên hệ', 'Vehicle & contact')}
        </ThemedText>
      </View>

      <View style={styles.bodySlot}>
        {isScanning ? (
          <View style={styles.cameraViewportShell}>
            <StaffInlinePlateScanner
              active
              onCancel={handleScanCancel}
              onPlateDetected={handlePlateDetected}
              t={t}
            />
          </View>
        ) : (
          <View style={styles.formBody}>
            {permissionDenied ? (
              <View style={styles.permissionBanner}>
                <ThemedText style={styles.permissionText}>
                  {t('Cần quyền camera để quét biển số', 'Camera access is required to scan plates')}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.fieldBlock}>
              <ThemedText style={styles.label}>{t('Biển số xe', 'License plate')}</ThemedText>
              <View style={styles.plateRow}>
                <Pressable
                  disabled={isDisabled || isSearching}
                  onPress={() => void handleScanPress()}
                  style={({ pressed }) => [styles.scanBtn, pressed && styles.btnPressed]}>
                  <Ionicons color={DesignColors.primaryFocus} name="scan-outline" size={20} />
                </Pressable>
                <TextInput
                  autoCapitalize="characters"
                  editable={!isDisabled && !isSearching}
                  onChangeText={onPlateChange}
                  placeholder="51A-123.45"
                  placeholderTextColor={DesignColors.placeholder}
                  style={[styles.input, styles.plateInput]}
                  value={plateQuery}
                />
                <Pressable
                  disabled={isDisabled || isSearching}
                  onPress={onSearch}
                  style={({ pressed }) => [styles.searchBtn, pressed && styles.btnPressed]}>
                  {isSearching ? (
                    <ActivityIndicator color={DesignColors.onPrimary} size="small" />
                  ) : (
                    <Ionicons color={DesignColors.onPrimary} name="search" size={18} />
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.vehicleBannerSlot}>
              {foundVehicle ? (
                <View style={styles.vehicleBanner}>
                  <View style={styles.vehicleDot} />
                  <View style={styles.vehicleText}>
                    <ThemedText style={styles.vehiclePlate}>{foundVehicle.licensePlate}</ThemedText>
                    <ThemedText style={styles.vehicleMeta}>
                      {resolveVehicleTypeLabel(foundVehicle.vehicleTypeId)}
                      {foundVehicle.monthlyCardId
                        ? t(' · Thẻ tháng', ' · Monthly')
                        : t(' · Vé ngày', ' · Daily')}
                    </ThemedText>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.fieldBlock}>
              <ThemedText style={styles.label}>{t('Số điện thoại', 'Phone number')}</ThemedText>
              <TextInput
                editable={!isDisabled}
                keyboardType="phone-pad"
                onChangeText={onPhoneChange}
                placeholder={t('SĐT KHÁCH (10 SỐ)', 'CUSTOMER PHONE (10 DIGITS)')}
                placeholderTextColor={DesignColors.placeholder}
                style={styles.input}
                value={phone}
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    section: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.lg,
      overflow: 'hidden',
    },
    titleRow: {
      height: 20,
      marginBottom: Spacing.sm,
      justifyContent: 'center',
    },
    sectionTitle: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: '700',
      fontSize: 15,
      lineHeight: 20,
    },
    titleHidden: {
      opacity: 0,
    },
    bodySlot: {
      height: CHECKIN_VEHICLE_BODY_HEIGHT,
      width: '100%',
      position: 'relative',
    },
    cameraViewportShell: {
      flex: 1,
      width: '100%',
      height: '100%',
      borderRadius: CHECKIN_CAMERA_BORDER_RADIUS,
      overflow: 'hidden',
      backgroundColor: '#000',
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
    },
    formBody: {
      flex: 1,
      gap: FIELD_GAP,
    },
    permissionBanner: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 5,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: `${DesignColors.accentAmber}55`,
      backgroundColor: `${DesignColors.accentAmber}14`,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    permissionText: {
      ...Typography.caption,
      color: DesignColors.accentAmber,
      fontSize: 11,
    },
    fieldBlock: {
      gap: 6,
    },
    label: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.9,
      fontSize: 10,
      fontWeight: '600',
      lineHeight: 14,
    },
    plateRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 8,
      height: 52,
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
      paddingVertical: 0,
      height: 52,
    },
    plateInput: {
      ...Typography.mono,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    scanBtn: {
      width: 52,
      height: 52,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: `${DesignColors.primaryFocus}55`,
      backgroundColor: `${DesignColors.primaryFocus}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchBtn: {
      width: 52,
      height: 52,
      borderRadius: Radius.lg,
      backgroundColor: DesignColors.primaryFocus,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: DesignColors.primaryFocus,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    btnPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.97 }],
    },
    vehicleBannerSlot: {
      height: VEHICLE_BANNER_SLOT,
      justifyContent: 'center',
    },
    vehicleBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: `${DesignColors.neonSuccess}12`,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: `${DesignColors.neonSuccess}40`,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      height: VEHICLE_BANNER_SLOT,
    },
    vehicleDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: DesignColors.neonSuccess,
    },
    vehicleText: {
      flex: 1,
      gap: 2,
    },
    vehiclePlate: {
      ...Typography.body,
      color: DesignColors.ink,
      fontWeight: '700',
      letterSpacing: 0.5,
      fontSize: 14,
      lineHeight: 18,
    },
    vehicleMeta: {
      ...Typography.caption,
      color: DesignColors.neonSuccess,
      fontSize: 11,
      lineHeight: 14,
    },
  });
}
