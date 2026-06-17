import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useAppToast } from '@/components/app-toast';
import { ThemedText } from '@/components/themed-text';
import { StaffActionButton } from '@/features/staff/components/staff-action-button';
import { StaffCheckInSlotPicker } from '@/features/staff/components/staff-check-in-slot-picker';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffPlateScannerModal } from '@/features/staff/components/staff-plate-scanner-modal';
import { StaffTextInput } from '@/features/staff/components/staff-text-input';
import {
  createParkingSession,
  getVehicleByLicensePlate,
  resolveVehicleTypeLabel,
  type StaffVehicle,
} from '@/features/staff/api';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { formatTimeLabel, resolveSlotLabel } from '@/features/staff/lib/utils';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useDesignColors } from '@/hooks/use-design-colors';
import { useLanguagePreference } from '@/hooks/language-preference';

export default function StaffCheckInScreen() {
  useStaffRoleGuard();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const { floors, isLoadingSlots, loadParkingSlots, recordCheckIn } = useStaffWorkspace();

  const [plateQuery, setPlateQuery] = useState('');
  const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState<StaffVehicle | null>(null);
  const [checkInPhone, setCheckInPhone] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadParkingSlots();
    }, [loadParkingSlots]),
  );

  const handleSearchVehicle = useCallback(
    async (plateOverride?: string) => {
      const plate = (plateOverride ?? plateQuery).trim();
      if (!plate) {
        showToast(t('Nhập biển số để tra cứu', 'Enter a license plate to search'), 'error');
        return;
      }

      setIsSearchingVehicle(true);
      try {
        const vehicle = await getVehicleByLicensePlate(plate);
        setFoundVehicle(vehicle);
        setPlateQuery(vehicle.licensePlate);
        showToast(t('Đã tìm thấy xe', 'Vehicle found'), 'success');
      } catch (error) {
        setFoundVehicle(null);
        showToast(
          error instanceof Error ? error.message : t('Không tìm thấy xe', 'Vehicle not found'),
          'error',
        );
      } finally {
        setIsSearchingVehicle(false);
      }
    },
    [plateQuery, showToast, t],
  );

  const handlePlateDetected = useCallback(
    (plate: string) => {
      setPlateQuery(plate);
      setFoundVehicle(null);
      showToast(t('Đã quét biển số', 'Plate scanned'), 'success');
      void handleSearchVehicle(plate);
    },
    [handleSearchVehicle, showToast, t],
  );

  async function handleCheckIn() {
    const phone = checkInPhone.trim();
    const plate = (foundVehicle?.licensePlate ?? plateQuery).trim();

    if (!phone) {
      showToast(t('Nhập số điện thoại khách', 'Enter customer phone number'), 'error');
      return;
    }
    if (!plate) {
      showToast(t('Nhập hoặc tra cứu biển số', 'Enter or look up a license plate'), 'error');
      return;
    }
    if (!selectedSlotId) {
      showToast(t('Chọn ô trống', 'Select an available slot'), 'error');
      return;
    }

    setIsCheckingIn(true);
    try {
      const session = await createParkingSession({
        phone,
        licensePlate: plate,
        parkingSlotId: selectedSlotId,
      });
      const refreshedFloors = await loadParkingSlots();
      const slotLabel = resolveSlotLabel(session.parkingSlotId, refreshedFloors ?? floors);
      recordCheckIn({
        id: session._id,
        plate,
        slotLabel,
        status: session.status,
        timeLabel: formatTimeLabel(session.checkInTime),
      });
      setSelectedSlotId(null);
      setCheckInPhone('');
      setPlateQuery('');
      setFoundVehicle(null);
      showToast(t('Check-in thành công', 'Check-in successful'), 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : t('Check-in thất bại', 'Check-in failed'),
        'error',
      );
    } finally {
      setIsCheckingIn(false);
    }
  }

  return (
    <>
      <StaffPageShell
        eyebrow={t('Check-in', 'Check in')}
        title={t('Nhận xe vào bãi', 'Vehicle check-in')}
        subtitle={t(
          'Quét biển số, chọn ô trống và xác nhận.',
          'Scan plate, pick a slot, confirm.',
        )}>
        <View style={styles.cardElevated}>
          <ThemedText style={styles.eyebrow}>{t('Tra cứu xe', 'Vehicle lookup')}</ThemedText>

          <Pressable
            disabled={isSearchingVehicle}
            onPress={() => setScannerVisible(true)}
            style={({ pressed }) => [
              styles.scanCtaButton,
              pressed && styles.scanCtaButtonPressed,
              isSearchingVehicle && { opacity: 0.6 },
            ]}>
            <Ionicons color={DesignColors.accentViolet} name="scan" size={20} />
            <ThemedText style={styles.scanCtaButtonText}>
              {t('Quét biển số', 'Scan plate')}
            </ThemedText>
          </Pressable>

          <View style={styles.searchRow}>
            <StaffTextInput
              autoCapitalize="characters"
              editable={!isSearchingVehicle}
              mono
              onChangeText={(text) => {
                setPlateQuery(text);
                if (foundVehicle && text !== foundVehicle.licensePlate) {
                  setFoundVehicle(null);
                }
              }}
              placeholder={t('51K-298.74', '51K-298.74')}
              style={styles.searchInput}
              value={plateQuery}
            />
            <StaffActionButton
              compact
              disabled={isSearchingVehicle}
              label={t('Tìm', 'Find')}
              loading={isSearchingVehicle}
              onPress={() => handleSearchVehicle()}
            />
          </View>

          {foundVehicle ? (
            <View style={styles.vehicleFoundCard}>
              <ThemedText style={styles.sessionPlate}>{foundVehicle.licensePlate}</ThemedText>
              <ThemedText style={styles.sessionDetail}>
                {resolveVehicleTypeLabel(foundVehicle.vehicleTypeId)}
                {foundVehicle.monthlyCardId
                  ? t(' · Thẻ tháng', ' · Monthly card')
                  : t(' · Vé ngày', ' · Daily ticket')}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.cardElevated}>
          <ThemedText style={styles.eyebrow}>{t('Xác nhận check-in', 'Confirm check-in')}</ThemedText>
          <ThemedText style={styles.fieldLabel}>{t('Số điện thoại', 'Phone number')}</ThemedText>
          <StaffTextInput
            editable={!isCheckingIn}
            keyboardType="phone-pad"
            onChangeText={setCheckInPhone}
            placeholder={t('SĐT khách (10 số)', 'Customer phone (10 digits)')}
            value={checkInPhone}
          />
          <ThemedText style={styles.fieldLabel}>{t('Chọn ô trống', 'Available slot')}</ThemedText>
          <StaffCheckInSlotPicker
            accentColor={DesignColors.accentViolet}
            floors={floors}
            isLoading={isLoadingSlots}
            onSelectSlot={setSelectedSlotId}
            selectedSlotId={selectedSlotId}
            styles={styles}
            t={t}
          />
          <StaffActionButton
            disabled={isCheckingIn}
            label={t('Xác nhận check-in', 'Confirm check-in')}
            loading={isCheckingIn}
            onPress={handleCheckIn}
            style={styles.fullWidthButton}
          />
        </View>
      </StaffPageShell>

      <StaffPlateScannerModal
        onClose={() => setScannerVisible(false)}
        onPlateDetected={handlePlateDetected}
        t={t}
        visible={scannerVisible}
      />
    </>
  );
}
