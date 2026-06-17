import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ParkingFloor } from '@/features/staff/api';
import type { StaffStyles } from '@/features/staff/styles/common';
import { resolveFloorPresentation, sortFloorsLikeParkingMap } from '@/lib/parking-floor-config';

type StaffCheckInSlotPickerProps = {
  floors: ParkingFloor[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  isLoading: boolean;
  styles: StaffStyles;
  t: (vi: string, en: string) => string;
  accentColor: string;
};

export function StaffCheckInSlotPicker({
  floors,
  selectedSlotId,
  onSelectSlot,
  isLoading,
  styles,
  t,
  accentColor,
}: StaffCheckInSlotPickerProps) {
  const orderedFloors = useMemo(() => sortFloorsLikeParkingMap(floors), [floors]);

  const floorsWithAvailability = useMemo(
    () =>
      orderedFloors
        .map((floor) => ({
          floor,
          availableSlots: floor.slots.filter((slot) => slot.status === 'AVAILABLE'),
        }))
        .filter((entry) => entry.availableSlots.length > 0),
    [orderedFloors],
  );

  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);

  useEffect(() => {
    if (floorsWithAvailability.length === 0) {
      setActiveFloorId(null);
      return;
    }
    setActiveFloorId((current) => {
      if (current && floorsWithAvailability.some((entry) => entry.floor._id === current)) {
        return current;
      }
      return floorsWithAvailability[0].floor._id;
    });
  }, [floorsWithAvailability]);

  const activeEntry = useMemo(
    () => floorsWithAvailability.find((entry) => entry.floor._id === activeFloorId) ?? null,
    [activeFloorId, floorsWithAvailability],
  );

  if (isLoading) {
    return <ActivityIndicator color={accentColor} />;
  }

  if (floorsWithAvailability.length === 0) {
    return <ThemedText style={styles.hint}>{t('Không có ô trống', 'No available slots')}</ThemedText>;
  }

  const activePresentation = activeEntry
    ? resolveFloorPresentation(activeEntry.floor, t)
    : null;

  return (
    <View style={styles.slotPickerPanel}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.floorTabs}
        showsHorizontalScrollIndicator={false}>
        {floorsWithAvailability.map(({ floor, availableSlots }) => {
          const active = floor._id === activeFloorId;
          const { tabLabel } = resolveFloorPresentation(floor, t);
          return (
            <Pressable
              key={floor._id}
              onPress={() => setActiveFloorId(floor._id)}
              style={({ pressed }) => [
                styles.floorTab,
                active && styles.floorTabActive,
                pressed && styles.floorTabPressed,
              ]}>
              <ThemedText style={active ? styles.floorTabTextActive : styles.floorTabText}>
                {tabLabel}
              </ThemedText>
              <ThemedText style={active ? styles.floorTabBadgeActive : styles.floorTabBadge}>
                {availableSlots.length}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeEntry && activePresentation ? (
        <>
          <View style={styles.slotPickerMeta}>
            <ThemedText style={styles.slotPickerMetaText}>
              {activePresentation.available} {t('ô trống', 'free slots')}
            </ThemedText>
            <ThemedText style={styles.slotPickerMetaMuted}>
              {t('Chạm để chọn', 'Tap to select')}
            </ThemedText>
          </View>
          <View style={styles.compactSlotGrid}>
            {activeEntry.availableSlots.map((slot) => {
              const selected = selectedSlotId === slot._id;
              return (
                <Pressable
                  key={slot._id}
                  onPress={() => onSelectSlot(slot._id)}
                  style={({ pressed }) => [
                    styles.compactSlotCell,
                    selected && styles.compactSlotCellSelected,
                    pressed && styles.compactSlotCellPressed,
                  ]}>
                  <ThemedText
                    style={[styles.compactSlotCellText, selected && styles.compactSlotCellTextSelected]}>
                    {slot.slotNumber}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}
