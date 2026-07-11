import { useEffect, useState } from "react";

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
  AVAILABLE: "border-status-empty/50 bg-status-empty/15 text-status-empty",
  RESERVED: "border-status-reserved/50 bg-status-reserved/15 text-status-reserved",
  UNAVAILABLE: "border-border bg-secondary text-muted-foreground opacity-60",
  "CURRENTLY-IN-USED": "border-status-full/50 bg-status-full/15 text-status-full",
};

export type LotSlotFilterSelection = {
  slotId: string;
  slotNumber: string;
  floor: ParkingFloor;
};

type StaffLotSlotFilterDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parkingFloors: ParkingFloor[];
  selectedSlotId?: string | null;
  onSelect: (selection: LotSlotFilterSelection) => void;
};

export function StaffLotSlotFilterDialog({
  open,
  onOpenChange,
  parkingFloors,
  selectedSlotId,
  onSelect,
}: StaffLotSlotFilterDialogProps) {
  const [floorId, setFloorId] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    const stillValid = parkingFloors.some((floor) => floor._id === floorId);
    if (stillValid) {
      return;
    }

    const floorWithSelection = selectedSlotId
      ? parkingFloors.find((floor) => floor.slots.some((slot) => slot._id === selectedSlotId))
      : null;

    setFloorId(floorWithSelection?._id ?? parkingFloors[0]?._id ?? "");
  }, [open, parkingFloors, floorId, selectedSlotId]);

  const selectedFloor = parkingFloors.find((floor) => floor._id === floorId) ?? null;
  const floorSlots = selectedFloor?.slots ?? [];

  const availableCount = floorSlots.filter((slot) => slot.status === "AVAILABLE").length;
  const reservedCount = floorSlots.filter((slot) => slot.status === "RESERVED").length;
  const inUsedCount = floorSlots.filter((slot) => slot.status === "CURRENTLY-IN-USED").length;
  const unavailableCount = floorSlots.filter((slot) => slot.status === "UNAVAILABLE").length;

  const handleSlotClick = (slot: ParkingSlot) => {
    if (!selectedFloor) {
      return;
    }

    onSelect({
      slotId: slot._id,
      slotNumber: slot.slotNumber,
      floor: selectedFloor,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0">
        <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Chọn ô đỗ</DialogTitle>
            <DialogDescription>
              Bấm vào một ô để lọc danh sách xe trong bãi theo vị trí đó.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {parkingFloors.length === 0 ? (
            <DashboardEmptyState>Chưa có dữ liệu tầng / chỗ đỗ.</DashboardEmptyState>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="lot-slot-filter-floor">Tầng</Label>
                <Select value={floorId} onValueChange={setFloorId}>
                  <SelectTrigger id="lot-slot-filter-floor" className="h-11 rounded-xl">
                    <SelectValue placeholder="Chọn tầng" />
                  </SelectTrigger>
                  <SelectContent>
                    {parkingFloors.map((floor) => (
                      <SelectItem key={floor._id} value={floor._id}>
                        {floor.floorName}
                        {floor.vehicleType?.type ? ` · ${floor.vehicleType.type}` : ""}
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

                    return (
                      <button
                        key={slot._id}
                        type="button"
                        onClick={() => handleSlotClick(slot)}
                        className={cn(
                          "relative min-h-11 cursor-pointer rounded-xl border px-2 py-2.5 text-left text-sm font-semibold transition-all hover:brightness-110",
                          slotButtonStyles[slot.status],
                          isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "",
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
