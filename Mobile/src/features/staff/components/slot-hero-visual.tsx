import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ParkingSlotStatus } from '@/features/staff/api';
import { StaffStatusBadge } from '@/features/staff/components/premium';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';
import { formatDbStatus } from '@/lib/db-status';

type SlotHeroVisualProps = {
  slotNumber: string;
  floorName?: string;
  status: ParkingSlotStatus | string;
  variant?: 'cell' | 'header';
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
  /**
   * Flying overlay chrome — square fill so the outer animated clip owns the
   * rounded corners (avoids double-radius / "lost corners" while scaling).
   */
  flight?: boolean;
};

function resolveStatusStyle(
  status: ParkingSlotStatus | string,
  styles: ReturnType<typeof createStaffStyles>,
  variant: 'cell' | 'header',
) {
  if (status === 'CURRENTLY-IN-USED') {
    return variant === 'header' ? styles.slotHeroHeaderInUse : styles.slotStatusInUse;
  }
  if (status === 'UNAVAILABLE') {
    return variant === 'header' ? styles.slotHeroHeaderUnavailable : styles.slotStatusUnavailable;
  }
  if (status === 'RESERVED') {
    return variant === 'header' ? styles.slotHeroHeaderReserved : styles.slotStatusReserved;
  }
  return variant === 'header' ? styles.slotHeroHeaderAvailable : styles.slotStatusAvailable;
}

function resolveStatusBadge(status: ParkingSlotStatus | string) {
  const label = formatDbStatus(status, 'AVAILABLE');
  if (label === 'CURRENTLY-IN-USED') {
    return { label, tone: 'occupied' as const };
  }
  if (label === 'UNAVAILABLE') {
    return { label, tone: 'neutral' as const };
  }
  if (label === 'RESERVED') {
    return { label, tone: 'reserved' as const };
  }
  return { label: 'AVAILABLE', tone: 'available' as const };
}

export function SlotHeroVisual({
  slotNumber,
  floorName,
  status,
  variant = 'cell',
  style,
  fill = false,
  flight = false,
}: SlotHeroVisualProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const isHeader = variant === 'header';
  const statusBadge = resolveStatusBadge(status);
  const flightChrome = flight
    ? {
        borderRadius: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderWidth: 0,
        backgroundColor: 'transparent',
      }
    : null;

  function resolveCellTextStyle() {
    if (status === 'CURRENTLY-IN-USED') {
      return [styles.slotCellText, styles.slotCellTextInUse];
    }
    if (status === 'RESERVED') {
      return [styles.slotCellText, styles.slotCellTextReserved];
    }
    if (status === 'UNAVAILABLE') {
      return [styles.slotCellText, styles.slotCellTextUnavailable];
    }
    return styles.slotCellText;
  }

  if (isHeader) {
    return (
      <View
        style={[
          styles.slotHeroHeader,
          !flight && resolveStatusStyle(status, styles, 'header'),
          fill && styles.slotHeroFill,
          flightChrome,
          style,
        ]}>
        <View style={styles.slotHeroHeaderContent}>
          {!flight && floorName ? (
            <ThemedText style={styles.slotHeroEyebrow}>{floorName}</ThemedText>
          ) : null}
          <ThemedText style={styles.slotHeroTitle} numberOfLines={1}>
            {slotNumber}
          </ThemedText>
          {/* Status stays on the detail page — hide during flight so shrink looks like a cell. */}
          {flight ? null : <StaffStatusBadge label={statusBadge.label} tone={statusBadge.tone} />}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.slotCell,
        fill && { width: '100%', flex: 1 },
        resolveStatusStyle(status, styles, 'cell'),
        fill && styles.slotHeroFill,
        flightChrome,
        style,
      ]}>
      <ThemedText style={resolveCellTextStyle()}>{slotNumber}</ThemedText>
    </View>
  );
}

/** Must match `slotCell.borderRadius` (Radius.lg). */
export const SLOT_CELL_BORDER_RADIUS = 12;
/** Must match `slotHeroHeader.borderRadius` (Radius.xl). */
export const SLOT_HEADER_BORDER_RADIUS = 16;
