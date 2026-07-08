import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ParkingSession } from "@/services/parking.service";
import type { Reservation } from "@/services/reservation.service";

type ReservationDetailDialogProps = {
  reservation: Reservation | null;
  parkingSession?: ParkingSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showCreateSessionAction?: boolean;
  onCreateSession?: () => void;
  isCreatingSession?: boolean;
  createSessionDisabledReason?: string;
  showExpiryAt?: boolean;
  statusLabel?: string;
};

export function ReservationDetailDialog({
  reservation,
  parkingSession = null,
  open,
  onOpenChange,
  showCreateSessionAction = false,
  onCreateSession,
  isCreatingSession = false,
  createSessionDisabledReason,
  showExpiryAt = true,
  statusLabel,
}: ReservationDetailDialogProps) {
  if (!reservation) {
    return null;
  }

  const slotLabel = getSlotLabel(reservation);
  const floorName = getFloorName(reservation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Thông tin đặt chỗ</DialogTitle>
          <DialogDescription>
            Slot {slotLabel}
            {floorName ? ` · ${floorName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <SectionHeading>Trạng thái</SectionHeading>
            <Badge className={cn("border", getStatusBadgeClass(reservation.status))} variant="outline">
              {statusLabel ?? reservation.status}
            </Badge>
          </section>

          <section className="space-y-3">
            <SectionHeading>Người đặt</SectionHeading>
            <DetailGrid>
              <DetailRow label="Họ tên" value={getDriverName(reservation)} />
              <DetailRow label="Email" value={getDriverEmail(reservation)} />
              <DetailRow label="Số điện thoại" value={getDriverPhone(reservation)} />
            </DetailGrid>
          </section>

          <section className="space-y-3">
            <SectionHeading>Xe</SectionHeading>
            <DetailGrid>
              <DetailRow label="Biển số" value={getVehiclePlate(reservation)} mono />
              <DetailRow label="Loại xe" value={getVehicleType(reservation)} />
            </DetailGrid>
          </section>

          <section className="space-y-3">
            <SectionHeading>Slot</SectionHeading>
            <DetailGrid>
              <DetailRow label="Mã slot" value={slotLabel} mono />
              <DetailRow label="Tầng" value={floorName} />
              <DetailRow label="Trạng thái slot" value={getSlotStatus(reservation)} />
            </DetailGrid>
          </section>

          <section className="space-y-3">
            <SectionHeading>Thời gian</SectionHeading>
            <DetailGrid>
              <DetailRow label="Đặt lúc" value={formatDateTime(reservation.reservedAt)} />
              <DetailRow label="Dự kiến đến" value={formatDateTime(reservation.expectedArrival)} />
              {showExpiryAt ? (
                <DetailRow label="Hết hạn giữ chỗ" value={formatDateTime(reservation.expiryAt)} />
              ) : null}
              {parkingSession?.checkInTime ? (
                <DetailRow label="Check-in lúc" value={formatDateTime(parkingSession.checkInTime)} />
              ) : null}
              {parkingSession?.checkOutTime ? (
                <DetailRow label="Check-out lúc" value={formatDateTime(parkingSession.checkOutTime)} />
              ) : null}
            </DetailGrid>
          </section>

          {showCreateSessionAction ? (
            <section className="space-y-3 border-t border-border pt-4">
              <SectionHeading>Check-in</SectionHeading>
              {createSessionDisabledReason ? (
                <p className="text-sm text-muted-foreground">{createSessionDisabledReason}</p>
              ) : null}
              <Button
                type="button"
                className="w-full rounded-xl"
                disabled={Boolean(createSessionDisabledReason) || isCreatingSession || !onCreateSession}
                onClick={onCreateSession}
              >
                {isCreatingSession ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Đang tạo parking session...
                  </>
                ) : (
                  "Tạo parking session (điền sẵn thông tin)"
                )}
              </Button>
            </section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </h3>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-2.5 rounded-xl border border-border bg-secondary/50 p-4">{children}</dl>;
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:items-start sm:gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("break-all text-sm font-medium", mono && "font-mono text-[12px]")}>
        {value || "—"}
      </dd>
    </div>
  );
}

function getDriverName(reservation: Reservation) {
  if (typeof reservation.driverId === "object") {
    return reservation.driverId.fullName ?? "—";
  }
  return reservation.driverId;
}

function getDriverEmail(reservation: Reservation) {
  if (typeof reservation.driverId === "object") {
    return reservation.driverId.email ?? "—";
  }
  return "—";
}

function getDriverPhone(reservation: Reservation) {
  if (typeof reservation.driverId === "object") {
    return reservation.driverId.phone ?? "—";
  }
  return "—";
}

function getVehiclePlate(reservation: Reservation) {
  if (typeof reservation.vehicleId === "string") {
    return reservation.vehicleId;
  }
  return reservation.vehicleId.licensePlate ?? reservation.vehicleId._id;
}

function getVehicleType(reservation: Reservation) {
  if (typeof reservation.vehicleId === "string") {
    return "—";
  }
  return reservation.vehicleId.vehicleTypeId?.type ?? "—";
}

function getSlotLabel(reservation: Reservation) {
  if (typeof reservation.parkingSlotId === "string") {
    return reservation.parkingSlotId;
  }
  return reservation.parkingSlotId.slotNumber ?? reservation.parkingSlotId._id;
}

function getFloorName(reservation: Reservation) {
  if (typeof reservation.parkingSlotId === "string") {
    return "—";
  }
  return reservation.parkingSlotId.floorId?.floorName ?? "—";
}

function getSlotStatus(reservation: Reservation) {
  if (typeof reservation.parkingSlotId === "string") {
    return "—";
  }
  return reservation.parkingSlotId.status ?? "—";
}

function formatDateTime(value?: string) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "PENDING":
      return "border-amber-400/40 bg-amber-500/10 text-amber-500";
    case "CLAIMED":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-500";
    case "EXPIRED":
      return "border-slate-400/40 bg-slate-500/10 text-slate-300";
    case "CANCELLED":
      return "border-rose-400/40 bg-rose-500/10 text-rose-500";
    default:
      return "border-border bg-secondary/40 text-secondary-foreground";
  }
}
