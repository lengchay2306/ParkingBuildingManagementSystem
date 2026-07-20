import { useEffect, useState } from "react";
import { LoaderCircle, MapPin } from "lucide-react";

import {
  StaffWalkInSlotPickerDialog,
  type WalkInSlotSelection,
} from "@/components/staff/StaffWalkInSlotPickerDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getParkingSessionSlotId,
  getSessionLicensePlate,
  getSessionSlotLabel,
  getSessionVehicleTypeId,
  getSessionVehicleTypeLabel,
  type ParkingFloor,
  type ParkingSession,
} from "@/services/parking.service";

type StaffCorrectSessionSlotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ParkingSession | null;
  parkingFloors: ParkingFloor[];
  isSubmitting?: boolean;
  onConfirm: (payload: { sessionId: string; parkingSlotId: string }) => void | Promise<void>;
};

export function StaffCorrectSessionSlotDialog({
  open,
  onOpenChange,
  session,
  parkingFloors,
  isSubmitting = false,
  onConfirm,
}: StaffCorrectSessionSlotDialogProps) {
  const [selectedSlot, setSelectedSlot] = useState<WalkInSlotSelection | null>(null);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);

  const vehicleTypeId = session ? getSessionVehicleTypeId(session, parkingFloors) : null;
  const currentSlotId = session ? getParkingSessionSlotId(session) : null;
  const currentSlotLabel = session ? getSessionSlotLabel(session, parkingFloors) : undefined;

  useEffect(() => {
    if (!open) {
      setSelectedSlot(null);
      setSlotPickerOpen(false);
    }
  }, [open, session?._id]);

  if (!session) {
    return null;
  }

  const plate = getSessionLicensePlate(session) ?? "—";
  const vehicleTypeLabel = getSessionVehicleTypeLabel(session, parkingFloors) ?? "—";
  const canSubmit =
    Boolean(selectedSlot) &&
    selectedSlot?.slot._id !== currentSlotId &&
    !isSubmitting;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0">
          <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
            <DialogHeader>
              <DialogTitle>Sửa chỗ đậu</DialogTitle>
              <DialogDescription>
                Phiên #{session._id.slice(-6).toUpperCase()} · {plate}
                {!session.isGuest && session.vehicleId
                  ? " · Xe có chủ (cập nhật đồng bộ trang khách)"
                  : ""}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="rounded-xl border border-border/70 bg-secondary/30 px-4 py-3 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Chỗ hiện tại
              </p>
              <p className="mt-1 font-semibold">{currentSlotLabel ?? "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Loại xe: {vehicleTypeLabel}</p>
            </div>

            {!vehicleTypeId ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Không xác định được loại xe của phiên — không thể chọn chỗ mới.
              </p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setSlotPickerOpen(true)}
                  className="flex w-full items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-primary/10"
                >
                  <div className="ui-field-icon size-9 shrink-0">
                    <MapPin className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Chỗ mới · bấm để chọn
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
                      {selectedSlot
                        ? `${selectedSlot.slot.slotNumber} · ${selectedSlot.floor.floorName}`
                        : "Chọn ô AVAILABLE cùng loại xe"}
                    </p>
                  </div>
                </button>

                {selectedSlot?.slot._id === currentSlotId ? (
                  <p className="text-xs text-destructive">Chỗ mới trùng với chỗ hiện tại.</p>
                ) : null}
              </>
            )}
          </div>

          <div className="shrink-0 border-t border-border/70 px-6 py-4">
            <Button
              type="button"
              className="h-11 w-full rounded-xl text-sm font-semibold"
              disabled={!canSubmit}
              onClick={() => {
                if (!selectedSlot) {
                  return;
                }
                onConfirm({
                  sessionId: session._id,
                  parkingSlotId: selectedSlot.slot._id,
                });
              }}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                "Cập nhật chỗ đậu"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {vehicleTypeId ? (
        <StaffWalkInSlotPickerDialog
          open={slotPickerOpen}
          onOpenChange={setSlotPickerOpen}
          parkingFloors={parkingFloors}
          vehicleTypeId={vehicleTypeId}
          selectedSlotId={selectedSlot?.slot._id}
          onSelect={setSelectedSlot}
        />
      ) : null}
    </>
  );
}
