import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';

import { useAppToast } from '@/components/app-toast';
import { StaffCheckInConfirmBar } from '@/features/staff/components/staff-check-in-confirm-bar';
import { StaffCheckInSlotPicker } from '@/features/staff/components/staff-check-in-slot-picker';
import { StaffCheckInVehicleSection } from '@/features/staff/components/staff-check-in-vehicle-section';
import { StaffPageShell } from '@/features/staff/components/staff-page-shell';
import { StaffScreenHeader } from '@/features/staff/components/premium';
import {
  createParkingSession,
  getVehicleByLicensePlate,
  resolveVehicleTypeLabel,
  type StaffVehicle,
} from '@/features/staff/api';
import { useStaffWorkspace } from '@/features/staff/context/staff-workspace-context';
import { useStaffRoleGuard } from '@/features/staff/hooks/use-staff-role-guard';
import { formatTimeLabel, resolveSlotLabel } from '@/features/staff/lib/utils';
import { useLanguagePreference } from '@/hooks/language-preference';

export default function StaffCheckInScreen() {
  useStaffRoleGuard();
  const { showToast } = useAppToast();
  const { t } = useLanguagePreference();
  const { floors, isLoadingSlots, loadParkingSlots, recordCheckIn } = useStaffWorkspace();

  const [plateQuery, setPlateQuery] = useState('');
  const [isSearchingVehicle, setIsSearchingVehicle] = useState(false);
  const [foundVehicle, setFoundVehicle] = useState<StaffVehicle | null>(null);
  const [checkInPhone, setCheckInPhone] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

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

  const handlePlateScanned = useCallback(
    (plate: string) => {
      setFoundVehicle(null);
      showToast(t('Đã quét biển số', 'Plate scanned'), 'success');
      void handleSearchVehicle(plate);
    },
    [handleSearchVehicle, showToast, t],
  );

  const handlePlateChange = useCallback(
    (text: string) => {
      setPlateQuery(text);
      if (foundVehicle && text !== foundVehicle.licensePlate) {
        setFoundVehicle(null);
      }
    },
    [foundVehicle],
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
      showToast(t('Chọn ô trống', 'Select an available spot'), 'error');
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
        slotId: selectedSlotId,
        status: session.status,
        timeLabel: formatTimeLabel(session.checkInTime),
        checkInTime: session.checkInTime,
        vehicleType: foundVehicle ? resolveVehicleTypeLabel(foundVehicle.vehicleTypeId) : undefined,
        sessionType: session.sessionType,
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

  const canSubmit =
    checkInPhone.trim().length > 0 &&
    (foundVehicle?.licensePlate ?? plateQuery).trim().length > 0 &&
    !!selectedSlotId;

  return (
    <StaffPageShell
      footer={
        <StaffCheckInConfirmBar
          disabled={!canSubmit}
          label={t('Xác nhận vào bãi', 'Confirm Entry')}
          loading={isCheckingIn}
          onPress={handleCheckIn}
        />
      }
      header={
        <StaffScreenHeader
          subtitle={t('Nhập thông tin, chọn tầng và ô gửi', 'Enter details, pick floor and spot')}
          title={t('Check-in', 'Check-in')}
        />
      }>
      <StaffCheckInVehicleSection
        foundVehicle={foundVehicle}
        isDisabled={isCheckingIn}
        isSearching={isSearchingVehicle}
        onPhoneChange={setCheckInPhone}
        onPlateChange={handlePlateChange}
        onPlateScanned={handlePlateScanned}
        onSearch={() => void handleSearchVehicle()}
        phone={checkInPhone}
        plateQuery={plateQuery}
        t={t}
      />

      <StaffCheckInSlotPicker
        floors={floors}
        isLoading={isLoadingSlots}
        onSelectSlot={setSelectedSlotId}
        selectedSlotId={selectedSlotId}
        t={t}
      />
    </StaffPageShell>
  );
}
