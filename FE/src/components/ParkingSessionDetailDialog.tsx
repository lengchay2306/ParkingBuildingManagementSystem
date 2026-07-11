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
import {
  getSessionLicensePlate,
  getSessionVehicleTypeLabel,
  type ParkingSession,
} from "@/services/parking.service";

type ParkingSessionDetailDialogProps = {
  session: ParkingSession | null;
  slotNumber?: string;
  floorName?: string;
  vehicleTypeLabel?: string;
  licensePlateLabel?: string;
  showCheckoutAction?: boolean;
  onCheckout?: () => void;
  isCheckingOut?: boolean;
  checkoutLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ParkingSessionDetailDialog({
  session,
  slotNumber,
  floorName,
  vehicleTypeLabel,
  licensePlateLabel,
  showCheckoutAction = false,
  onCheckout,
  isCheckingOut = false,
  checkoutLabel,
  open,
  onOpenChange,
}: ParkingSessionDetailDialogProps) {
  if (!session) {
    return null;
  }

  const resolvedLicensePlate =
    licensePlateLabel ?? getSessionLicensePlate(session) ?? "—";
  const isGuest = session.isGuest || !session.checkInUserId;
  const isMonthlySession = session.sessionType === "MONTH";
  const resolvedCheckoutLabel =
    checkoutLabel ??
    (isMonthlySession ? "Kết thúc phiên (thẻ tháng)" : "Thanh toán VietQR & ra cổng");
  const resolvedSlotNumber =
    slotNumber ??
    (typeof session.parkingSlotId === "object" ? session.parkingSlotId.slotNumber : undefined) ??
    "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0">
        <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Thông tin xe đang gửi</DialogTitle>
            <DialogDescription>
              Slot {resolvedSlotNumber}
              {floorName ? ` · ${floorName}` : ""}
              {isGuest ? " · Khách vãng lai" : ""}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-4">
          <section className="space-y-3">
            <SectionHeading>Trạng thái</SectionHeading>
            <Badge className="border border-emerald-400/40 bg-emerald-500/10 text-emerald-500" variant="outline">
              {session.status}
            </Badge>
          </section>

          <section className="space-y-3">
            <SectionHeading>Khách</SectionHeading>
            <DetailGrid>
              {isGuest ? (
                <>
                  <DetailRow label="Loại khách" value="Khách vãng lai" />
                  <DetailRow label="Số điện thoại" value={session.phone ?? "—"} />
                </>
              ) : (
                <>
                  <DetailRow label="Họ tên" value={getUserName(session.checkInUserId)} />
                  <DetailRow label="Số điện thoại" value={getUserPhone(session.checkInUserId)} />
                </>
              )}
            </DetailGrid>
          </section>

          <section className="space-y-3">
            <SectionHeading>Xe</SectionHeading>
            <DetailGrid>
              <DetailRow label="Biển số" value={resolvedLicensePlate} mono />
              <DetailRow
                label="Loại xe"
                value={
                  vehicleTypeLabel ??
                  getSessionVehicleTypeLabel(session) ??
                  getVehicleType(session.vehicleId)
                }
              />
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

          {showCheckoutAction && session.status === "ACTIVE" ? (
            <section className="space-y-3 border-t border-border pt-4">
              <SectionHeading>Ra cổng</SectionHeading>
              <p className="text-xs text-muted-foreground">
                {isMonthlySession
                  ? "Xe có thẻ tháng — kết thúc phiên không cần quét VietQR."
                  : "Phiên gửi ngày — tạo mã VietQR để khách thanh toán trước khi ra cổng."}
              </p>
              <Button
                type="button"
                className="w-full rounded-xl"
                disabled={isCheckingOut || !onCheckout}
                onClick={onCheckout}
              >
                {isCheckingOut ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  resolvedCheckoutLabel
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
  return <h3 className="ui-section-kicker">{children}</h3>;
}

function DetailGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="ui-detail-grid grid grid-cols-1 gap-x-3 gap-y-2.5 p-4 sm:grid-cols-[120px_1fr]">
      {children}
    </dl>
  );
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
    <>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("break-all text-sm font-medium", mono && "font-mono text-[12px]")}>
        {value || "—"}
      </dd>
    </>
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

function getVehicleType(vehicle?: string | { vehicleTypeId?: { type?: string } } | null) {
  if (!vehicle || typeof vehicle === "string") {
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
