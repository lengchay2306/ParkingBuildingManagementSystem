import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import {
  SLOT_CELL_BORDER_RADIUS,
  SlotHeroVisual,
} from '@/features/staff/components/slot-hero-visual';
import type { ParkingFloor, ParkingSlot } from '@/features/staff/api';
import { useHeroTransition } from '@/features/staff/motion/hero-transition-context';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useDesignColors } from '@/hooks/use-design-colors';
import {
  resolveFloorPresentation,
  sortFloorsLikeParkingMap,
} from '@/lib/parking-floor-config';

type StaffFloorSlotsPanelProps = {
  floors: ParkingFloor[];
  t: (vi: string, en: string) => string;
  onOpenSlot: (
    slot: ParkingSlot,
    floorId: string,
    floorName: string,
    ref: View,
  ) => void;
};

type SlotCellProps = {
  slot: ParkingSlot;
  floorId: string;
  floorName: string;
  styles: ReturnType<typeof createStaffStyles>;
  onOpen: StaffFloorSlotsPanelProps['onOpenSlot'];
};

function SlotCell({ slot, floorId, floorName, styles, onOpen }: SlotCellProps) {
  const ref = useRef<View>(null);
  const { isHeroHidden } = useHeroTransition();
  const hidden = isHeroHidden(slot._id);

  return (
    <Pressable
      style={({ pressed }) => [styles.slotPressable, pressed && styles.slotPressablePressed]}
      onPress={() => {
        if (ref.current) {
          onOpen(slot, floorId, floorName, ref.current);
        }
      }}>
      <View
        ref={ref}
        collapsable={false}
        style={[styles.slotCellInner, hidden && styles.slotHeroHidden]}>
        <SlotHeroVisual slotNumber={slot.slotNumber} status={slot.status} variant="cell" fill />
      </View>
    </Pressable>
  );
}

export function StaffFloorSlotsPanel({ floors, t, onOpenSlot }: StaffFloorSlotsPanelProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);

  const orderedFloors = useMemo(() => sortFloorsLikeParkingMap(floors), [floors]);

  useEffect(() => {
    if (orderedFloors.length === 0) {
      setActiveFloorId(null);
      return;
    }
    setActiveFloorId((current) => {
      if (current && orderedFloors.some((floor) => floor._id === current)) {
        return current;
      }
      return orderedFloors[0]._id;
    });
  }, [orderedFloors]);

  const activeFloor = useMemo(
    () => orderedFloors.find((floor) => floor._id === activeFloorId) ?? orderedFloors[0] ?? null,
    [activeFloorId, orderedFloors],
  );

  const activePresentation = useMemo(
    () => (activeFloor ? resolveFloorPresentation(activeFloor, t) : null),
    [activeFloor, t],
  );

  if (orderedFloors.length === 0) {
    return <ThemedText style={styles.hint}>{t('Không có dữ liệu tầng', 'No floor data')}</ThemedText>;
  }

  return (
    <View style={styles.floorPanel}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.floorTabs}
        showsHorizontalScrollIndicator={false}>
        {orderedFloors.map((floor) => {
          const active = floor._id === activeFloor?._id;
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
            </Pressable>
          );
        })}
      </ScrollView>

      {activeFloor && activePresentation ? (
        <>
          <View style={styles.floorMeta}>
            <ThemedText style={styles.floorMetaTitle}>{activePresentation.metaTitle}</ThemedText>
            <View style={styles.floorMetaRow}>
              <ThemedText style={styles.floorMetaStats}>
                {activePresentation.available} / {activePresentation.total} {t('trống', 'free')}
              </ThemedText>
              <ThemedText style={styles.floorMetaStatsMuted}>
                {t('Đang gửi', 'In use')}: {activePresentation.inUsed}
              </ThemedText>
            </View>
            {activePresentation.designSlotCount !== null &&
            activePresentation.designSlotCount !== activePresentation.total ? (
              <ThemedText style={styles.floorMetaSub}>
                {t('Bản đồ 3D', '3D map')}: {activePresentation.designSlotCount}{' '}
                {t('ô thiết kế', 'design slots')} · {t('Hệ thống', 'System')}:{' '}
                {activePresentation.total} {t('ô', 'slots')}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.legendRow}>
            <LegendItem
              color={DesignColors.accentEmerald}
              label={t('Trống', 'Available')}
              styles={styles}
            />
            <LegendItem
              color={DesignColors.accentAmber}
              label={t('Đang gửi', 'In use')}
              styles={styles}
            />
            <LegendItem
              color={DesignColors.accentAmber}
              label={t('Đã đặt', 'Reserved')}
              styles={styles}
            />
            <LegendItem
              color={DesignColors.inkSubtle}
              label={t('Không dùng', 'Unavailable')}
              styles={styles}
            />
          </View>

          <View style={styles.slotGrid}>
            {activeFloor.slots.map((slot) => (
              <SlotCell
                key={slot._id}
                floorId={activeFloor._id}
                floorName={activeFloor.floorName}
                onOpen={onOpenSlot}
                slot={slot}
                styles={styles}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

function LegendItem({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createStaffStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText style={styles.legendText}>{label}</ThemedText>
    </View>
  );
}

export { SLOT_CELL_BORDER_RADIUS };
