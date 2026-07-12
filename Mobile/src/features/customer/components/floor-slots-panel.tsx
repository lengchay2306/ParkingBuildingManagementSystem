import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState } from 'react';
import { View, type TextStyle, type ViewStyle } from 'react-native';

import { ScalePressable } from '@/components/scale-pressable';
import { ThemedText } from '@/components/themed-text';
import { DesignColorPalette } from '@/constants/design';
import type { ParkingFloor, ParkingSlot } from '@/features/customer/api/parking';

export function isSlotBookable(slot: ParkingSlot, floor: ParkingFloor, vehicleType: string | null): boolean {
  if (slot.status !== 'AVAILABLE' || !vehicleType) {
    return false;
  }
  const normalized = vehicleType.toUpperCase();
  if (floor.vehicleType?.type?.toUpperCase() === normalized) {
    return true;
  }
  return floor.floorName.toUpperCase().includes(normalized);
}

export type FloorSlotsPanelStyles = {
  floorList: ViewStyle;
  floorBlock: ViewStyle;
  floorHeader: ViewStyle;
  buttonPressed: ViewStyle;
  floorHeaderText: ViewStyle;
  floorName: TextStyle;
  floorStats: TextStyle;
  slotGrid: ViewStyle;
  slotChip: ViewStyle;
  slotAvailable: ViewStyle;
  slotInUse: ViewStyle;
  slotReserved?: ViewStyle;
  slotUnavailable: ViewStyle;
  slotChipActive: ViewStyle;
  slotChipDisabled: ViewStyle;
  slotChipText: TextStyle;
  slotChipTextActive: TextStyle;
  slotChipTextDisabled: TextStyle;
};

export function FloorSlotsPanel({
  floors,
  t,
  styles,
  DesignColors,
  selectable = false,
  selectedSlotId,
  onSelectSlot,
  vehicleType,
}: {
  floors: ParkingFloor[];
  t: (vi: string, en: string) => string;
  styles: FloorSlotsPanelStyles;
  DesignColors: DesignColorPalette;
  selectable?: boolean;
  selectedSlotId?: string | null;
  onSelectSlot?: (slotId: string) => void;
  vehicleType?: string | null;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (floors.length === 0) {
      setExpandedIds(new Set());
      return;
    }

    if (selectable && vehicleType) {
      const matchingIds = floors
        .filter((floor) => floor.vehicleType?.type === vehicleType)
        .map((floor) => floor._id);
      setExpandedIds(new Set(matchingIds));
      return;
    }

    setExpandedIds(new Set([floors[0]._id]));
  }, [floors, selectable, vehicleType]);

  function toggleFloor(floorId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(floorId)) {
        next.delete(floorId);
      } else {
        next.add(floorId);
      }
      return next;
    });
  }

  return (
    <View style={styles.floorList}>
      {floors.map((floor) => {
        const expanded = expandedIds.has(floor._id);
        return (
          <View key={floor._id} style={styles.floorBlock}>
            <ScalePressable
              onPress={() => toggleFloor(floor._id)}
              style={styles.floorHeader}
              scaleTo={0.98}
            >
              <View style={styles.floorHeaderText}>
                <ThemedText style={styles.floorName}>{floor.floorName}</ThemedText>
                <ThemedText style={styles.floorStats}>
                  {floor.vehicleType?.type ?? '—'} · {t('Trống', 'Available')}:{' '}
                  {floor.slotStats?.available ?? 0} / {floor.slotStats?.total ?? floor.slots.length}
                </ThemedText>
              </View>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={DesignColors.inkMuted}
              />
            </ScalePressable>
            {expanded ? (
              <View style={styles.slotGrid}>
                {floor.slots.map((slot) => {
                  const bookable = selectable && isSlotBookable(slot, floor, vehicleType ?? null);
                  const active = selectedSlotId === slot._id;
                  const statusStyle =
                    slot.status === 'AVAILABLE'
                      ? styles.slotAvailable
                      : slot.status === 'CURRENTLY-IN-USED'
                        ? styles.slotInUse
                        : slot.status === 'RESERVED'
                          ? styles.slotReserved
                          : styles.slotUnavailable;

                  return (
                    <ScalePressable
                      key={slot._id}
                      disabled={!bookable && selectable}
                      onPress={() => bookable && onSelectSlot?.(slot._id)}
                      style={[
                        styles.slotChip,
                        statusStyle,
                        active && styles.slotChipActive,
                        selectable && !bookable && styles.slotChipDisabled,
                      ]}
                      scaleTo={bookable || !selectable ? 0.92 : 1}
                    >
                      <ThemedText
                        style={[
                          styles.slotChipText,
                          active && styles.slotChipTextActive,
                          selectable && !bookable && styles.slotChipTextDisabled,
                        ]}
                      >
                        {slot.slotNumber}
                      </ThemedText>
                    </ScalePressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
