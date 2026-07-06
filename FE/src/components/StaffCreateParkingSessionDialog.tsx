import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

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
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Tạo parking session</DialogTitle>
          <DialogDescription>
            Slot {slotNumber ?? "—"}
            {floorName ? ` · ${floorName}` : ""} · Chỉ áp dụng cho slot Available hoặc Reserved.
          </DialogDescription>
        </DialogHeader>

        {fromReservation ? (
          <p className="rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">
            Thông tin điền sẵn từ đặt chỗ
            {reservationDriverName ? ` của ${reservationDriverName}` : ""}. Kiểm tra trước khi tạo
            session.
          </p>
        ) : null}

        <form
          className="space-y-4"
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
              className="rounded-xl"
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
              className="rounded-xl font-mono"
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              "Tạo parking session"
            )}
          </Button>
        </form>
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
