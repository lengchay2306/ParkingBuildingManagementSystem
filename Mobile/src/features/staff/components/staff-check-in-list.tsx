import React from "react";
import { View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import type { StaffStyles } from "@/features/staff/styles/common";
import type { StaffCheckInRecord } from "@/features/staff/lib/utils";

type StaffCheckInListProps = {
  items: StaffCheckInRecord[];
  emptyMessage: string;
  styles: StaffStyles;
};

export function StaffCheckInList({ items, emptyMessage, styles }: StaffCheckInListProps) {
  if (items.length === 0) {
    return <ThemedText style={styles.hint}>{emptyMessage}</ThemedText>;
  }

  return (
    <View style={styles.sessionList}>
      {items.map((item) => (
        <View key={item.id} style={styles.sessionRow}>
          <View style={styles.sessionRowLeft}>
            <ThemedText style={styles.sessionRowId}>{item.id.slice(-8)}</ThemedText>
            <ThemedText style={styles.sessionRowPlate}>{item.plate}</ThemedText>
            <ThemedText style={styles.sessionRowSlot}>{item.slotLabel}</ThemedText>
          </View>
          <View style={styles.sessionRowRight}>
            <View style={styles.statusBadgeActive}>
              <ThemedText style={styles.statusBadgeTextActive}>{item.status}</ThemedText>
            </View>
            <ThemedText style={styles.sessionRowDuration}>{item.timeLabel}</ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}
