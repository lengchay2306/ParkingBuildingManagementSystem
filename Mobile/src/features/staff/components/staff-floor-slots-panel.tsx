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
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
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
  emptyHint?: string;
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

export function StaffFloorSlotsPanel({ floors, t, onOpenSlot, emptyHint }: StaffFloorSlotsPanelProps) {
  const DesignColors = useStaffDesignColors();
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
    return (
      <ThemedText style={styles.emptyState}>
        {emptyHint ?? t('Không có ô phù hợp bộ lọc.', 'No spots match this filter.')}
      </ThemedText>
    );
  }

  return (
    <View style={styles.floorPanel}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.floorTabs}
        showsHorizontalScrollIndicator={false}>
        {orderedFloors.map((floor) => {
          const active = floor._id === activeFloor?._id;
          const presentation = resolveFloorPresentation(floor, t);
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
                {presentation.tabLabel}
              </ThemedText>
              <ThemedText style={active ? styles.floorTabBadgeActive : styles.floorTabBadge}>
                {presentation.available}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeFloor && activePresentation ? (
        <>
          <View style={styles.floorMetaCompact}>
            <ThemedText numberOfLines={1} style={styles.floorMetaCompactTitle}>
              {activePresentation.metaTitle}
            </ThemedText>
            <ThemedText style={styles.floorMetaCompactStats}>
              {activePresentation.available}/{activePresentation.total} {t('trống', 'free')} ·{' '}
              {activePresentation.inUsed} {t('đang gửi', 'in use')}
            </ThemedText>
          </View>

          <View style={styles.legendRowCompact}>
            <LegendDot color={DesignColors.accentEmerald} label={t('Trống', 'Free')} styles={styles} />
            <LegendDot color={DesignColors.accentAmber} label={t('Gửi', 'In use')} styles={styles} />
            <LegendDot color={DesignColors.accentSky} label={t('Đặt', 'Reserved')} styles={styles} />
            <LegendDot color={DesignColors.inkSubtle} label={t('Khóa', 'Locked')} styles={styles} />
          </View>

          {activeFloor.slots.length === 0 ? (
            <ThemedText style={styles.hint}>
              {emptyHint ?? t('Không có ô trên tầng này.', 'No spots on this floor.')}
            </ThemedText>
          ) : (
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
          )}
        </>
      ) : null}
    </View>
  );
}

function LegendDot({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createStaffStyles>;
}) {
  return (
    <View style={styles.legendItemCompact}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <ThemedText style={styles.legendTextCompact}>{label}</ThemedText>
    </View>
  );
}

export { SLOT_CELL_BORDER_RADIUS };
