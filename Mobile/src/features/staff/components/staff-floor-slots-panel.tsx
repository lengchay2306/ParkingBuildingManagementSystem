import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import {
  SLOT_CELL_BORDER_RADIUS,
  SlotHeroVisual,
} from '@/features/staff/components/slot-hero-visual';
import type { ParkingFloor, ParkingSlot } from '@/features/staff/api';
import {
  useHeroRippleReveal,
  useHeroTransition,
} from '@/features/staff/motion/hero-transition-context';
import {
  STAFF_REVEAL_DURATION,
  STAFF_REVEAL_STAGGER,
  staffRevealEntering,
} from '@/features/staff/motion/staff-motion';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import {
  resolveFloorPresentation,
  sortFloorsLikeParkingMap,
  sortSlotsByNumber,
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
  index: number;
  styles: ReturnType<typeof createStaffStyles>;
  onOpen: StaffFloorSlotsPanelProps['onOpenSlot'];
};

const floorSwitchEasing = Easing.out(Easing.cubic);
const FLOOR_SWITCH_MS = 280;

function SlotCell({ slot, floorId, floorName, index, styles, onOpen }: SlotCellProps) {
  const ref = useRef<View>(null);
  const { isHeroHidden } = useHeroTransition();
  const hidden = isHeroHidden(slot._id);
  const rippleStyle = useHeroRippleReveal(ref);

  const entering = useMemo(
    () =>
      FadeInDown.delay(40 + index * STAFF_REVEAL_STAGGER)
        .duration(STAFF_REVEAL_DURATION)
        .easing(floorSwitchEasing),
    [index],
  );

  return (
    <Animated.View entering={entering} style={[styles.slotPressable, rippleStyle]}>
      <Pressable
        style={({ pressed }) => [
          { flex: 1, width: '100%' },
          pressed && styles.slotPressablePressed,
        ]}
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
    </Animated.View>
  );
}

export function StaffFloorSlotsPanel({ floors, t, onOpenSlot, emptyHint }: StaffFloorSlotsPanelProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null);
  /** 1 = higher floor index, -1 = lower — drives slide direction. */
  const [switchDirection, setSwitchDirection] = useState<1 | -1>(1);

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

  const activeFloorIndex = useMemo(
    () => orderedFloors.findIndex((floor) => floor._id === activeFloorId),
    [activeFloorId, orderedFloors],
  );

  const activeFloor = useMemo(
    () => orderedFloors.find((floor) => floor._id === activeFloorId) ?? orderedFloors[0] ?? null,
    [activeFloorId, orderedFloors],
  );

  const activeFloorSlots = useMemo(
    () => (activeFloor ? sortSlotsByNumber(activeFloor.slots) : []),
    [activeFloor],
  );

  const activePresentation = useMemo(
    () => (activeFloor ? resolveFloorPresentation(activeFloor, t) : null),
    [activeFloor, t],
  );

  const selectFloor = (floorId: string) => {
    if (floorId === activeFloorId) {
      return;
    }
    const nextIndex = orderedFloors.findIndex((floor) => floor._id === floorId);
    if (nextIndex < 0) {
      return;
    }
    setSwitchDirection(nextIndex >= Math.max(activeFloorIndex, 0) ? 1 : -1);
    setActiveFloorId(floorId);
  };

  const panelEntering = useMemo(
    () =>
      switchDirection === 1
        ? SlideInRight.duration(FLOOR_SWITCH_MS).easing(floorSwitchEasing)
        : SlideInLeft.duration(FLOOR_SWITCH_MS).easing(floorSwitchEasing),
    [switchDirection],
  );

  const panelExiting = useMemo(
    () =>
      switchDirection === 1
        ? SlideOutLeft.duration(200).easing(Easing.in(Easing.cubic))
        : SlideOutRight.duration(200).easing(Easing.in(Easing.cubic)),
    [switchDirection],
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
              onPress={() => selectFloor(floor._id)}
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
        <View style={styles.floorSwitchViewport}>
          <Animated.View
            key={activeFloor._id}
            entering={panelEntering}
            exiting={panelExiting}
            style={styles.floorSwitchPane}>
            <Animated.View entering={staffRevealEntering(40)}>
              <View style={styles.floorMetaCompact}>
                <ThemedText numberOfLines={1} style={styles.floorMetaCompactTitle}>
                  {activePresentation.metaTitle}
                </ThemedText>
                <ThemedText style={styles.floorMetaCompactStats}>
                  {activePresentation.available}/{activePresentation.total} {t('trống', 'free')} ·{' '}
                  {activePresentation.inUsed} {t('đang gửi', 'in use')}
                </ThemedText>
              </View>
            </Animated.View>

            <View style={styles.legendRowCompact}>
              <LegendDot color={DesignColors.accentEmerald} label={t('Trống', 'Free')} styles={styles} />
              <LegendDot color={DesignColors.accentAmber} label={t('Gửi', 'In use')} styles={styles} />
              <LegendDot color={DesignColors.accentSky} label={t('Đặt', 'Reserved')} styles={styles} />
              <LegendDot color={DesignColors.inkSubtle} label={t('Khóa', 'Locked')} styles={styles} />
            </View>

            {activeFloorSlots.length === 0 ? (
              <ThemedText style={styles.hint}>
                {emptyHint ?? t('Không có ô trên tầng này.', 'No spots on this floor.')}
              </ThemedText>
            ) : (
              <View style={styles.slotGrid}>
                {activeFloorSlots.map((slot, index) => (
                  <SlotCell
                    key={slot._id}
                    floorId={activeFloor._id}
                    floorName={activeFloor.floorName}
                    index={index}
                    onOpen={onOpenSlot}
                    slot={slot}
                    styles={styles}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        </View>
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
