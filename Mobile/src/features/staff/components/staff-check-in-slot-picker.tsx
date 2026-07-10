import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, Typography } from "@/constants/design";
import type { ParkingFloor } from "@/features/staff/api";
import { resolveFloorPresentation, sortFloorsLikeParkingMap } from "@/lib/parking-floor-config";
import { useDesignColors } from "@/hooks/use-design-colors";

const GRID_COLUMNS = 4;
const CELL_GAP = 6;
const SECTION_PADDING = 12;
type StaffCheckInSlotPickerProps = {
  floors: ParkingFloor[];
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  /** When set, only this slot is shown (reserved for a PENDING reservation). */
  lockedSlotId?: string | null;
  isLoading: boolean;
  t: (vi: string, en: string) => string;
};

export function StaffCheckInSlotPicker({
  floors,
  selectedSlotId,
  onSelectSlot,
  lockedSlotId,
  isLoading,
  t,
}: StaffCheckInSlotPickerProps) {
  const DesignColors = useDesignColors();
  const styles = useMemo(() => createStyles(DesignColors), [DesignColors]);

  const orderedFloors = useMemo(() => sortFloorsLikeParkingMap(floors), [floors]);

  const floorsWithAvailability = useMemo(() => {
    if (lockedSlotId) {
      for (const floor of orderedFloors) {
        const lockedSlot = floor.slots.find((slot) => slot._id === lockedSlotId);
        if (lockedSlot) {
          return [{ floor, availableSlots: [lockedSlot] }];
        }
      }
      return [];
    }

    return orderedFloors
      .map((floor) => ({
        floor,
        availableSlots: floor.slots.filter((slot) => slot.status === "AVAILABLE"),
      }))
      .filter((entry) => entry.availableSlots.length > 0);
  }, [lockedSlotId, orderedFloors]);

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
    return (
      <View style={styles.section}>
        <ActivityIndicator color={DesignColors.primaryFocus} style={{ marginVertical: 24 }} />
      </View>
    );
  }

  if (floorsWithAvailability.length === 0) {
    return (
      <View style={styles.section}>
        <ThemedText style={styles.empty}>
          {lockedSlotId
            ? t("Không tìm thấy ô đã đặt", "Reserved spot not found on map")
            : t("Không có ô trống", "No available spots")}
        </ThemedText>
      </View>
    );
  }

  const activePresentation = activeEntry ? resolveFloorPresentation(activeEntry.floor, t) : null;

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>
        {lockedSlotId ? t("Ô đã đặt", "Reserved spot") : t("Chọn ô gửi", "Select spot")}
      </ThemedText>

      {!lockedSlotId ? (
        <ScrollView
          horizontal
          contentContainerStyle={styles.pillRow}
          showsHorizontalScrollIndicator={false}
        >
          {floorsWithAvailability.map(({ floor, availableSlots }) => {
            const active = floor._id === activeFloorId;
            const { tabLabel } = resolveFloorPresentation(floor, t);
            return (
              <Pressable
                key={floor._id}
                onPress={() => setActiveFloorId(floor._id)}
                style={({ pressed }) => [
                  styles.pill,
                  active && styles.pillActive,
                  pressed && styles.pillPressed,
                ]}
              >
                <ThemedText style={[styles.pillText, active && styles.pillTextActive]}>
                  {tabLabel} ({availableSlots.length})
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {activeEntry && activePresentation ? (
        <>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaHighlight}>
              {lockedSlotId
                ? t("Ô đã giữ cho khách", "Spot held for customer")
                : `${activeEntry.availableSlots.length} ${t("ô trống", "available spots")}`}
            </ThemedText>
            {!lockedSlotId ? (
              <ThemedText style={styles.metaMuted}>
                {" "}
                · {t("Chạm để chọn", "Tap to select")}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.grid}>
            {activeEntry.availableSlots.map((slot) => {
              const selected = selectedSlotId === slot._id;
              const isReserved = slot.status === "RESERVED";
              return (
                <View key={slot._id} style={styles.cellWrap}>
                  <Pressable
                    disabled={!!lockedSlotId}
                    onPress={() => onSelectSlot(slot._id)}
                    style={({ pressed }) => [
                      styles.cell,
                      isReserved && styles.cellReserved,
                      selected && styles.cellSelected,
                      pressed && !lockedSlotId && styles.cellPressed,
                    ]}
                  >
                    <ThemedText
                      numberOfLines={1}
                      style={[styles.cellText, selected && styles.cellTextSelected]}
                    >
                      {slot.slotNumber}
                    </ThemedText>
                    {!selected && !isReserved ? <View style={styles.availableDot} /> : null}
                    {!selected && isReserved ? <View style={styles.reservedDot} /> : null}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );
}

function createStyles(DesignColors: ReturnType<typeof useDesignColors>) {
  return StyleSheet.create({
    section: {
      backgroundColor: DesignColors.surface1,
      borderRadius: Radius.xl,
      borderWidth: 1,
      borderColor: DesignColors.hairline,
      padding: SECTION_PADDING,
      gap: Spacing.sm,
    },
    sectionTitle: {
      ...Typography.bodySm,
      color: DesignColors.ink,
      fontWeight: "700",
      fontSize: 15,
    },
    pillRow: {
      flexDirection: "row",
      gap: 8,
      paddingVertical: 2,
    },
    pill: {
      borderRadius: Radius.pill,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface3,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    pillActive: {
      borderColor: DesignColors.primaryFocus,
      backgroundColor: `${DesignColors.primaryFocus}22`,
      shadowColor: DesignColors.primaryFocus,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 8,
      elevation: 3,
    },
    pillPressed: {
      opacity: 0.9,
    },
    pillText: {
      ...Typography.caption,
      color: DesignColors.inkMuted,
      fontWeight: "600",
      fontSize: 12,
    },
    pillTextActive: {
      color: DesignColors.primaryFocus,
      fontWeight: "700",
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
    },
    metaHighlight: {
      ...Typography.caption,
      color: DesignColors.neonSuccess,
      fontWeight: "600",
      fontSize: 12,
    },
    metaMuted: {
      ...Typography.caption,
      color: DesignColors.inkSubtle,
      fontSize: 12,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -CELL_GAP / 2,
    },
    cellWrap: {
      width: `${100 / GRID_COLUMNS}%`,
      paddingHorizontal: CELL_GAP / 2,
      paddingBottom: CELL_GAP,
    },
    cell: {
      aspectRatio: 1.15,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: DesignColors.hairlineStrong,
      backgroundColor: DesignColors.surface3,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      paddingHorizontal: 2,
    },
    cellSelected: {
      backgroundColor: DesignColors.primaryFocus,
      borderColor: DesignColors.primaryFocus,
      shadowColor: DesignColors.primaryFocus,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 5,
    },
    cellReserved: {
      borderColor: `${DesignColors.primaryFocus}88`,
      backgroundColor: `${DesignColors.primaryFocus}14`,
    },
    cellPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.96 }],
    },
    cellText: {
      ...Typography.caption,
      color: DesignColors.neonSuccess,
      fontWeight: "700",
      fontSize: 10,
      letterSpacing: 0.1,
      textAlign: "center",
    },
    cellTextSelected: {
      color: DesignColors.onPrimary,
    },
    availableDot: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: DesignColors.neonSuccess,
    },
    reservedDot: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: DesignColors.primaryFocus,
    },
    empty: {
      ...Typography.bodySm,
      color: DesignColors.inkMuted,
      textAlign: "center",
      paddingVertical: Spacing.lg,
    },
  });
}
