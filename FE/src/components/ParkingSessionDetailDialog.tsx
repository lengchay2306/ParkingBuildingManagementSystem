import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ParkingSession } from "@/services/parking.service";

type ParkingSessionDetailDialogProps = {
  session: ParkingSession | null;
  slotNumber?: string;
  floorName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ParkingSessionDetailDialog({
  session,
  slotNumber,
  floorName,
  open,
  onOpenChange,
}: ParkingSessionDetailDialogProps) {
  if (!session) {
    return null;
  }

  const resolvedSlotNumber =
    slotNumber ??
    (typeof session.parkingSlotId === "object" ? session.parkingSlotId.slotNumber : undefined) ??
    "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Thông tin xe đang gửi</DialogTitle>
          <DialogDescription>
            Slot {resolvedSlotNumber}
            {floorName ? ` · ${floorName}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <section className="space-y-3">
            <SectionHeading>Trạng thái</SectionHeading>
            <Badge className="border border-emerald-400/40 bg-emerald-500/10 text-emerald-500" variant="outline">
              {session.status}
            </Badge>
          </section>

          <section className="space-y-3">
            <SectionHeading>Khách</SectionHeading>
            <DetailGrid>
              <DetailRow label="Họ tên" value={getUserName(session.checkInUserId)} />
              <DetailRow label="Số điện thoại" value={getUserPhone(session.checkInUserId)} />
            </DetailGrid>
          </section>

          <section className="space-y-3">
            <SectionHeading>Xe</SectionHeading>
            <DetailGrid>
              <DetailRow label="Biển số" value={getVehiclePlate(session.vehicleId)} mono />
              <DetailRow label="Loại xe" value={getVehicleType(session.vehicleId)} />
            </DetailGrid>
          </section>

          <section className="space-y-3">
            <SectionHeading>Phiên gửi xe</SectionHeading>
            <DetailGrid>
              <DetailRow label="Loại phiên" value={session.sessionType} />
              <DetailRow label="Check-in lúc" value={formatDateTime(session.checkInTime)} />
              <DetailRow label="Nhân viên check-in" value={getUserName(session.checkInStaffId)} />
            </DetailGrid>
          </section>
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

function getUserName(user?: string | { fullName?: string } | null) {
  if (!user) {
    return "—";
  }
  if (typeof user === "string") {
    return user;
  }
  return user.fullName ?? "—";
}

function getUserPhone(user?: string | { phone?: string } | null) {
  if (!user || typeof user === "string") {
    return "—";
  }
  return user.phone ?? "—";
}

function getVehiclePlate(vehicle: string | { licensePlate?: string; _id?: string }) {
  if (typeof vehicle === "string") {
    return vehicle;
  }
  return vehicle.licensePlate ?? vehicle._id ?? "—";
}

function getVehicleType(vehicle: string | { vehicleTypeId?: { type?: string } }) {
  if (typeof vehicle === "string") {
    return "—";
  }
  return vehicle.vehicleTypeId?.type ?? "—";
}

function formatDateTime(value?: string | null) {
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
