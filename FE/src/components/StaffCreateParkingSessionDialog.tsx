import { useEffect, useState } from "react";
import { LoaderCircle, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeStaffPhone } from "@/services/reservation.service";

type StaffCreateParkingSessionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotNumber?: string;
  floorName?: string;
  parkingSlotId: string | null;
  defaultPhone?: string;
  defaultLicensePlate?: string;
  fromReservation?: boolean;
  reservationDriverName?: string;
  onSubmit: (payload: { phone: string; licensePlate: string; parkingSlotId: string }) => void;
  isSubmitting?: boolean;
};

export function StaffCreateParkingSessionDialog({
  open,
  onOpenChange,
  slotNumber,
  floorName,
  parkingSlotId,
  defaultPhone = "",
  defaultLicensePlate = "",
  fromReservation = false,
  reservationDriverName,
  onSubmit,
  isSubmitting = false,
}: StaffCreateParkingSessionDialogProps) {
  const [phone, setPhone] = useState(defaultPhone);
  const [licensePlate, setLicensePlate] = useState(defaultLicensePlate);

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone);
      setLicensePlate(defaultLicensePlate);
    }
  }, [open, defaultPhone, defaultLicensePlate]);

  const phoneError = getPhoneValidationError(phone);
  const canSubmit = Boolean(parkingSlotId && phone.trim() && licensePlate.trim() && !phoneError);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0 sm:max-w-md">
        <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Tạo phiên đỗ xe</DialogTitle>
            <DialogDescription>
              Chỗ {slotNumber ?? "—"}
              {floorName ? ` · ${floorName}` : ""} · Chỉ áp dụng cho chỗ Trống hoặc Đã đặt.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3">
            <div className="ui-field-icon size-10">
              <MapPin className="size-5" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold">{slotNumber ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{floorName ?? "Chưa chọn tầng"}</p>
            </div>
          </div>

          {fromReservation ? (
            <p className="rounded-xl border border-status-yours/35 bg-status-yours/10 px-4 py-3 text-sm text-status-yours">
              Thông tin điền sẵn từ đặt chỗ
              {reservationDriverName ? ` của ${reservationDriverName}` : ""}. Kiểm tra trước khi tạo
              phiên đỗ xe.
            </p>
          ) : null}

          <form
            className="ui-form-panel space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit || !parkingSlotId || isSubmitting) {
                return;
              }
              onSubmit({
                phone: normalizeStaffPhone(phone.trim()) ?? phone.trim(),
                licensePlate: licensePlate.trim(),
                parkingSlotId,
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="staff-session-phone">Số điện thoại</Label>
              <Input
                id="staff-session-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0901234567"
                className="h-11 rounded-xl"
                autoComplete="tel"
              />
              {phoneError ? <p className="text-xs text-destructive">{phoneError}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-session-plate">Biển số xe</Label>
              <Input
                id="staff-session-plate"
                value={licensePlate}
                onChange={(event) => setLicensePlate(event.target.value)}
                placeholder="51A-12345"
                className="h-11 rounded-xl font-mono tracking-wide"
                autoComplete="off"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xl text-[13px] font-semibold"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                "Tạo phiên đỗ xe"
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getPhoneValidationError(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) {
    return undefined;
  }
  if (!/^(03|05|07|08|09)\d{8}$/.test(trimmed)) {
    return "Định dạng: 03/05/07/08/09 + 8 chữ số.";
  }
  return undefined;
}
