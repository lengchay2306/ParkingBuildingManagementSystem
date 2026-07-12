import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { ParkingSlotStatus } from '@/features/staff/api';
import { createStaffStyles } from '@/features/staff/styles/common';
import { useStaffDesignColors } from '@/features/staff/hooks/use-staff-design-colors';

type SlotHeroVisualProps = {
  slotNumber: string;
  floorName?: string;
  status: ParkingSlotStatus | string;
  variant?: 'cell' | 'header';
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
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
    return variant === 'header' ? styles.slotHeroHeaderInUse : styles.slotStatusInUse;
  }
  return variant === 'header' ? styles.slotHeroHeaderAvailable : styles.slotStatusAvailable;
}

function resolveStatusTextStyle(
  status: ParkingSlotStatus | string,
  styles: ReturnType<typeof createStaffStyles>,
) {
  if (status === 'CURRENTLY-IN-USED') {
    return styles.slotHeroStatusInUse;
  }
  if (status === 'UNAVAILABLE') {
    return styles.slotHeroStatusUnavailable;
  }
  if (status === 'RESERVED') {
    return styles.slotHeroStatusInUse;
  }
  return styles.slotHeroStatusAvailable;
}

export function SlotHeroVisual({
  slotNumber,
  floorName,
  status,
  variant = 'cell',
  style,
  fill = false,
}: SlotHeroVisualProps) {
  const DesignColors = useStaffDesignColors();
  const styles = useMemo(() => createStaffStyles(DesignColors), [DesignColors]);
  const isHeader = variant === 'header';

  function resolveCellTextStyle() {
    if (isHeader) {
      return styles.slotHeroTitle;
    }
    if (status === 'CURRENTLY-IN-USED') {
      return [styles.slotCellText, styles.slotCellTextInUse];
    }
    if (status === 'UNAVAILABLE') {
      return [styles.slotCellText, styles.slotCellTextUnavailable];
    }
    return styles.slotCellText;
  }

  return (
    <View
      style={[
        isHeader ? styles.slotHeroHeader : styles.slotCell,
        !isHeader && fill && { width: '100%', flex: 1 },
        resolveStatusStyle(status, styles, variant),
        fill && styles.slotHeroFill,
        style,
      ]}>
      {isHeader && floorName ? (
        <ThemedText style={styles.slotHeroEyebrow}>{floorName}</ThemedText>
      ) : null}
      <ThemedText style={resolveCellTextStyle()}>{slotNumber}</ThemedText>
      {isHeader ? (
        <ThemedText style={[styles.slotHeroStatus, resolveStatusTextStyle(status, styles)]}>
          {status === 'CURRENTLY-IN-USED'
            ? 'IN USE'
            : status === 'UNAVAILABLE'
              ? 'UNAVAILABLE'
              : 'AVAILABLE'}
        </ThemedText>
      ) : null}
    </View>
  );
}

export const SLOT_CELL_BORDER_RADIUS = 12;
export const SLOT_HEADER_BORDER_RADIUS = 16;
