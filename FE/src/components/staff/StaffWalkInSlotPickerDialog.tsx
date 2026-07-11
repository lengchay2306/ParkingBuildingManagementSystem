import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardEmptyState, DashboardLegend } from "@/components/dashboard-ui";
import { cn } from "@/lib/utils";
import type { ParkingFloor, ParkingSlot, ParkingSlotStatus } from "@/services/parking.service";

const slotStatusText: Record<ParkingSlotStatus, string> = {
  AVAILABLE: "Trống",
  RESERVED: "Đã đặt",
  UNAVAILABLE: "Không khả dụng",
  "CURRENTLY-IN-USED": "Đang dùng",
};

const slotButtonStyles: Record<ParkingSlotStatus, string> = {
  AVAILABLE:
    "border-status-empty/50 bg-status-empty/15 text-status-empty hover:border-status-empty hover:bg-status-empty/20 cursor-pointer",
  RESERVED:
    "border-status-reserved/50 bg-status-reserved/15 text-status-reserved opacity-70 cursor-not-allowed",
  UNAVAILABLE: "border-border bg-secondary text-muted-foreground opacity-60 cursor-not-allowed",
  "CURRENTLY-IN-USED":
    "border-status-full/50 bg-status-full/15 text-status-full opacity-70 cursor-not-allowed",
};

export type WalkInSlotSelection = {
  slot: ParkingSlot;
  floor: ParkingFloor;
};

type StaffWalkInSlotPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parkingFloors: ParkingFloor[];
  vehicleTypeId: string;
  selectedSlotId?: string | null;
  onSelect: (selection: WalkInSlotSelection) => void;
};

export function StaffWalkInSlotPickerDialog({
  open,
  onOpenChange,
  parkingFloors,
  vehicleTypeId,
  selectedSlotId,
  onSelect,
}: StaffWalkInSlotPickerDialogProps) {
  const matchingFloors = useMemo(
    () => parkingFloors.filter((floor) => floor.vehicleType?._id === vehicleTypeId),
    [parkingFloors, vehicleTypeId],
  );

  const [floorId, setFloorId] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const stillValid = matchingFloors.some((floor) => floor._id === floorId);
    if (stillValid) {
      return;
    }

    const floorWithSelection = selectedSlotId
      ? matchingFloors.find((floor) => floor.slots.some((slot) => slot._id === selectedSlotId))
      : null;

    setFloorId(floorWithSelection?._id ?? matchingFloors[0]?._id ?? "");
  }, [open, matchingFloors, floorId, selectedSlotId]);

  const selectedFloor = matchingFloors.find((floor) => floor._id === floorId) ?? null;
  const floorSlots = selectedFloor?.slots ?? [];

  const availableCount = floorSlots.filter((slot) => slot.status === "AVAILABLE").length;
  const reservedCount = floorSlots.filter((slot) => slot.status === "RESERVED").length;
  const inUsedCount = floorSlots.filter((slot) => slot.status === "CURRENTLY-IN-USED").length;
  const unavailableCount = floorSlots.filter((slot) => slot.status === "UNAVAILABLE").length;

  const handleSlotClick = (slot: ParkingSlot) => {
    if (slot.status !== "AVAILABLE" || !selectedFloor) {
      return;
    }

    onSelect({ slot, floor: selectedFloor });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0">
        <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Chọn chỗ đỗ</DialogTitle>
            <DialogDescription>
              Chỉ chọn được chỗ <strong>Trống</strong> trên tầng phù hợp loại xe.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {matchingFloors.length === 0 ? (
            <DashboardEmptyState>Không có tầng cho loại xe này.</DashboardEmptyState>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="slot-picker-floor">Tầng</Label>
                <Select value={floorId} onValueChange={setFloorId}>
                  <SelectTrigger id="slot-picker-floor" className="h-11 rounded-xl">
                    <SelectValue placeholder="Chọn tầng" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchingFloors.map((floor) => (
                      <SelectItem key={floor._id} value={floor._id}>
                        {floor.floorName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2">
                <DashboardLegend label={`Trống ${availableCount}`} tone="bg-status-empty" />
                <DashboardLegend label={`Đã đặt ${reservedCount}`} tone="bg-status-reserved" />
                <DashboardLegend
                  label={`Không khả dụng ${unavailableCount}`}
                  tone="bg-status-maintenance"
                />
                <DashboardLegend label={`Đang dùng ${inUsedCount}`} tone="bg-status-full" />
              </div>

              {floorSlots.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                  {floorSlots.map((slot) => {
                    const isSelected = selectedSlotId === slot._id;
                    const isAvailable = slot.status === "AVAILABLE";

                    return (
                      <button
                        key={slot._id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => handleSlotClick(slot)}
                        className={cn(
                          "relative min-h-11 rounded-xl border px-2 py-2.5 text-left text-sm font-semibold transition-all",
                          slotButtonStyles[slot.status],
                          isSelected && isAvailable
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-card"
                            : "",
                        )}
                        aria-label={`${slot.slotNumber} (${slotStatusText[slot.status]})`}
                      >
                        <span className="font-mono text-xs">{slot.slotNumber}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <DashboardEmptyState>Không có chỗ trên tầng này.</DashboardEmptyState>
              )}
            </>
          )}
        </div>

        <div className="shrink-0 border-t border-border/70 px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            className="w-full rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
