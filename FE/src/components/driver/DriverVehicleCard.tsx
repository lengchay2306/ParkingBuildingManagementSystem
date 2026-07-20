import { useState } from "react";
import {
  CalendarClock,
  CarFront,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  CreditCard,
  LoaderCircle,
  MapPin,
  ParkingCircle,
  Pencil,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getReservationVehicleId,
  getSessionSlotLabel,
  type ParkingSession,
} from "@/services/parking.service";
import type { Reservation } from "@/services/reservation.service";
import type { MonthlyCard, Vehicle, VehicleType } from "@/services/vehicle.service";

type DriverVehicleCardProps = {
  vehicle: Vehicle;
  vehicleTypes: VehicleType[];
  pendingReservation: Reservation | null;
  parkingSession: ParkingSession | null;
  canReserve?: boolean;
  isDeleting?: boolean;
  isSubscribing?: boolean;
  onReserve: () => void;
  onBuyMonthlyCard: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function DriverVehicleCard({
  vehicle,
  vehicleTypes,
  pendingReservation,
  parkingSession,
  canReserve = true,
  isDeleting = false,
  isSubscribing = false,
  onReserve,
  onBuyMonthlyCard,
  onEdit,
  onDelete,
}: DriverVehicleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMonthlyCardOpen, setIsMonthlyCardOpen] = useState(false);
  const isInactive = vehicle.status === "INACTIVE";
  const hasMonthlyCard = Boolean(vehicle.monthlyCardId);
  const vehicleTypeName = getVehicleTypeName(vehicle, vehicleTypes);
  const monthlyCard = resolveMonthlyCard(vehicle.monthlyCardId);
  const isInLot = parkingSession?.status === "ACTIVE" && !parkingSession?.checkOutTime;
  const inLotSlotLabel = parkingSession ? getSessionSlotLabel(parkingSession) : undefined;

  const handleToggleExpanded = () => {
    setIsExpanded((open) => {
      if (open) {
        setIsMonthlyCardOpen(false);
      }
      return !open;
    });
  };

  return (
    <article
      data-driver-vehicle-card=""
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 shadow-[0_12px_32px_-20px_hsl(var(--primary))]",
        isInactive && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3.5 p-4 sm:p-5">
        <div
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl border shadow-inner",
            isInactive ? "border-border bg-muted/30" : "border-primary/30 bg-primary/10",
          )}
        >
          <CarFront
            className={cn("size-6", isInactive ? "text-muted-foreground" : "text-primary")}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h3 className="font-mono text-base font-bold tracking-wide sm:text-lg">
                {vehicle.licensePlate}
              </h3>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                {vehicleTypeName}
              </span>
              {isInactive ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <CircleDashed className="size-3" />
                  Ngừng hoạt động
                </span>
              ) : hasMonthlyCard ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-status-yours/35 bg-status-yours/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-yours">
                  <CreditCard className="size-3" />
                  Thẻ tháng
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-status-empty/35 bg-status-empty/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-empty">
                  <CheckCircle2 className="size-3" />
                  Đã đăng ký
                </span>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleToggleExpanded}
              aria-expanded={isExpanded}
              className="h-8 shrink-0 rounded-xl px-2.5 text-xs font-semibold"
            >
              {isExpanded ? "Thu gọn" : "Chi tiết"}
              <ChevronDown
                className={cn("size-3.5 transition-transform duration-200", isExpanded && "rotate-180")}
              />
            </Button>
          </div>

          <div
            className={cn(
              "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out",
              isExpanded ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-2 pb-1">
                <div className="grid gap-2 sm:grid-cols-2">
                  <InfoTile
                    icon={CalendarClock}
                    label="Ngày đăng ký"
                    value={formatShortDate(vehicle.createdAt)}
                  />
                  <InfoTile
                    icon={Clock3}
                    label="Cập nhật"
                    value={formatShortDate(vehicle.updatedAt)}
                  />
                </div>

                {isInLot && inLotSlotLabel ? (
                  <InfoTile icon={MapPin} label="Chỗ đang gửi" value={inLotSlotLabel} />
                ) : null}

                {hasMonthlyCard ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsMonthlyCardOpen((open) => !open)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition",
                        isMonthlyCardOpen
                          ? "border-status-yours/45 bg-status-yours/10 text-status-yours"
                          : "border-status-yours/30 bg-status-yours/5 text-status-yours hover:bg-status-yours/10",
                      )}
                      aria-expanded={isMonthlyCardOpen}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <CreditCard className="size-3.5" />
                        Xem thời hạn thẻ tháng
                      </span>
                      <ChevronDown
                        className={cn(
                          "size-4 transition-transform duration-200",
                          isMonthlyCardOpen && "rotate-180",
                        )}
                      />
                    </button>
                    {isMonthlyCardOpen ? <MonthlyCardPanel card={monthlyCard} /> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isInactive ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-background/30 px-4 py-3 sm:px-5">
          {canReserve ? (
            <Button
              type="button"
              size="sm"
              onClick={onReserve}
              className="h-9 rounded-xl px-3 text-xs font-semibold"
            >
              <MapPin className="size-3.5" />
              Đặt chỗ
            </Button>
          ) : null}
          {!hasMonthlyCard ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onBuyMonthlyCard}
              disabled={isSubscribing}
              className="h-9 rounded-xl px-3 text-xs font-semibold"
            >
              {isSubscribing ? (
                <>
                  <LoaderCircle className="size-3.5 animate-spin" />
                  Đang tạo link...
                </>
              ) : (
                <>
                  <CreditCard className="size-3.5" />
                  Mua thẻ tháng
                </>
              )}
            </Button>
          ) : null}
          {pendingReservation ? (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-status-yours/35 bg-status-yours/10 px-2.5 py-1 text-[10px] font-semibold text-status-yours"
              title={
                pendingReservation.expectedArrival
                  ? `Đến ${formatShortDateTime(pendingReservation.expectedArrival)}`
                  : undefined
              }
            >
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {(pendingReservation.status ?? "PENDING").toUpperCase()}{" "}
                {getReservationSlotLabel(pendingReservation)}
              </span>
            </span>
          ) : null}
          {isInLot ? (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-status-empty/35 bg-status-empty/10 px-2.5 py-1 text-[10px] font-semibold text-status-empty"
              title={
                inLotSlotLabel
                  ? `Chỗ ${inLotSlotLabel}`
                  : parkingSession?.checkInTime
                    ? `Check-in ${formatShortDateTime(parkingSession.checkInTime)}`
                    : undefined
              }
            >
              <ParkingCircle className="size-3 shrink-0" />
              <span className="truncate">
                {(parkingSession?.status ?? "ACTIVE").toUpperCase()}
                {inLotSlotLabel ? ` · ${inLotSlotLabel}` : ""}
              </span>
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onEdit}
              className="size-9 rounded-xl"
              aria-label={`Sửa ${vehicle.licensePlate}`}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onDelete}
              disabled={isDeleting}
              className="size-9 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Xóa ${vehicle.licensePlate}`}
            >
              {isDeleting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof CarFront;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        highlight
          ? "border-primary/25 bg-primary/5"
          : "border-border/60 bg-background/40",
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        <Icon className="size-3 shrink-0" />
        {label}
      </div>
      <p
        className={cn(
          "mt-1 truncate text-xs font-medium",
          highlight ? "text-foreground" : "text-muted-foreground",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function MonthlyCardPanel({ card }: { card: MonthlyCard | null }) {
  if (!card) {
    return (
      <div className="rounded-xl border border-status-yours/30 bg-status-yours/5 px-4 py-3 text-sm text-muted-foreground">
        Thẻ tháng đang hoạt động. Chi tiết thời hạn chưa có từ hệ thống.
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(card.endDate);
  const isExpired = card.status === "EXPIRED" || (daysRemaining !== null && daysRemaining < 0);

  return (
    <div className="rounded-xl border border-status-yours/35 bg-status-yours/5 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-status-yours">
        Thông tin thẻ tháng
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <MonthlyCardField label="Mã thẻ" value={card.cardCode ?? "—"} mono />
        <MonthlyCardField
          label="Trạng thái"
          value={formatCardStatus(card.status)}
          tone={isExpired ? "danger" : "success"}
        />
        <MonthlyCardField label="Bắt đầu" value={formatShortDate(card.startDate)} />
        <MonthlyCardField label="Hết hạn" value={formatShortDate(card.endDate)} />
      </div>
      {daysRemaining !== null ? (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            isExpired ? "text-destructive" : "text-status-yours",
          )}
        >
          {isExpired
            ? "Thẻ đã hết hạn."
            : daysRemaining === 0
              ? "Hết hạn trong hôm nay."
              : `Còn ${daysRemaining} ngày sử dụng.`}
        </p>
      ) : null}
    </div>
  );
}

function MonthlyCardField({
  label,
  value,
  mono = false,
  tone = "default",
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-medium",
          mono && "font-mono",
          tone === "success" && "text-status-empty",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function resolveMonthlyCard(monthlyCardId: Vehicle["monthlyCardId"]): MonthlyCard | null {
  if (!monthlyCardId || typeof monthlyCardId === "string") {
    return null;
  }
  return monthlyCardId;
}

function getVehicleTypeName(vehicle: Vehicle, vehicleTypes: VehicleType[]) {
  if (typeof vehicle.vehicleTypeId === "object" && vehicle.vehicleTypeId?.type) {
    return vehicle.vehicleTypeId.type;
  }
  const matchedType = vehicleTypes.find((type) => type._id === vehicle.vehicleTypeId);
  return matchedType?.type ?? "Xe";
}

function getReservationSlotLabel(reservation: Reservation) {
  if (typeof reservation.parkingSlotId === "object") {
    return reservation.parkingSlotId.slotNumber ?? reservation.parkingSlotId._id;
  }
  return reservation.parkingSlotId ?? "—";
}

function formatShortDate(value?: string) {
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
  }).format(date);
}

function formatShortDateTime(value?: string) {
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCardStatus(status?: string) {
  return (status ?? "—").trim().toUpperCase() || "—";
}

function getDaysRemaining(endDate?: string) {
  if (!endDate) {
    return null;
  }
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function findPendingReservationForVehicle(
  vehicleId: string,
  reservations: Reservation[],
): Reservation | null {
  return (
    reservations.find(
      (reservation) =>
        reservation.status === "PENDING" && getReservationVehicleId(reservation) === vehicleId,
    ) ?? null
  );
}
