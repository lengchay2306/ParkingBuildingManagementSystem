import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CarFront, LoaderCircle, MapPin } from "lucide-react";

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
import { DashboardEmptyState, DashboardLegend } from "@/components/dashboard-ui";
import { getVehicleReserveBlockReason } from "@/lib/parking-validation";
import {
  getExpectedArrivalValidationMessage,
  RESERVATION_ARRIVAL_MAX_MS,
} from "@/lib/reservation-validation";
import { cn } from "@/lib/utils";
import {
  findFirstAvailableSlotForVehicleType,
  type ParkingFloor,
  type ParkingSession,
  type ParkingSlot,
  type ParkingSlotStatus,
} from "@/services/parking.service";
import {
  formatPricePolicyHourRange,
  formatVnd,
  getAllPricePoliciesForVehicleType,
  type PricePolicy,
} from "@/services/payment.service";
import type { Reservation } from "@/services/reservation.service";
import type { Vehicle, VehicleType } from "@/services/vehicle.service";

const slotStatusText: Record<ParkingSlotStatus, string> = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  UNAVAILABLE: "UNAVAILABLE",
  "CURRENTLY-IN-USED": "CURRENTLY-IN-USED",
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

type SlotSelection = {
  slot: ParkingSlot;
  floor: ParkingFloor;
};

type DriverVehicleReserveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  vehicleTypes: VehicleType[];
  parkingFloors: ParkingFloor[];
  reservations: Reservation[];
  vehicleParkingSessions: ParkingSession[];
  isSubmitting?: boolean;
  onReserve: (payload: {
    vehicleId: string;
    parkingSlotId: string;
    expectedArrival: string;
  }) => void;
};

export function DriverVehicleReserveDialog({
  open,
  onOpenChange,
  vehicle,
  vehicleTypes,
  parkingFloors,
  reservations,
  vehicleParkingSessions,
  isSubmitting = false,
  onReserve,
}: DriverVehicleReserveDialogProps) {
  const vehicleTypeId = vehicle ? getVehicleTypeId(vehicle) : null;
  const vehicleTypeName = vehicle
    ? getVehicleTypeName(vehicle, vehicleTypes)
    : "—";

  const matchingFloors = useMemo(
    () =>
      vehicleTypeId
        ? parkingFloors.filter((floor) => floor.vehicleType?._id === vehicleTypeId)
        : [],
    [parkingFloors, vehicleTypeId],
  );

  const pricePoliciesQuery = useQuery({
    queryKey: ["vehicle-type-price-policies", vehicleTypeId] as const,
    queryFn: () => getAllPricePoliciesForVehicleType(vehicleTypeId!),
    enabled: open && Boolean(vehicleTypeId),
    staleTime: 5 * 60 * 1000,
  });

  const pricePolicies = pricePoliciesQuery.data ?? [];
  const monthlyRate = useMemo(
    () => pricePolicies.find((policy) => policy.monthlyRate)?.monthlyRate ?? null,
    [pricePolicies],
  );

  const [floorId, setFloorId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<SlotSelection | null>(null);
  const [isSlotGridOpen, setIsSlotGridOpen] = useState(false);
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(getDefaultExpectedArrivalDate);
  const [expectedArrivalTime, setExpectedArrivalTime] = useState(getDefaultExpectedArrivalTime);

  const minExpectedArrivalTime =
    expectedArrivalDate === getLocalDateInputValue()
      ? toLocalTimeInputValue(Date.now() + 60_000)
      : undefined;

  const maxArrivalTimestamp = Date.now() + RESERVATION_ARRIVAL_MAX_MS;
  const maxExpectedArrivalDate = getLocalDateInputValue(new Date(maxArrivalTimestamp));
  const maxExpectedArrivalTime =
    expectedArrivalDate === maxExpectedArrivalDate
      ? toLocalTimeInputValue(maxArrivalTimestamp)
      : undefined;

  useEffect(() => {
    if (!open || !vehicle || !vehicleTypeId) {
      return;
    }

    setIsSlotGridOpen(false);
    setExpectedArrivalDate(getDefaultExpectedArrivalDate());
    setExpectedArrivalTime(getDefaultExpectedArrivalTime());

    const autoSlot = findFirstAvailableSlotForVehicleType(parkingFloors, vehicleTypeId);
    setSelectedSlot(autoSlot);

    const floorWithSlot = autoSlot?.floor._id;
    setFloorId(floorWithSlot ?? matchingFloors[0]?._id ?? "");
  }, [open, vehicle, vehicleTypeId, parkingFloors, matchingFloors]);

  useEffect(() => {
    if (!open || !vehicleTypeId) {
      return;
    }

    const stillValid = matchingFloors.some((floor) => floor._id === floorId);
    if (stillValid) {
      return;
    }

    setFloorId(matchingFloors[0]?._id ?? "");
  }, [open, matchingFloors, floorId, vehicleTypeId]);

  const selectedFloor = matchingFloors.find((floor) => floor._id === floorId) ?? null;
  const floorSlots = selectedFloor?.slots ?? [];

  const handleFloorChange = (nextFloorId: string) => {
    setFloorId(nextFloorId);
    const nextFloor = matchingFloors.find((floor) => floor._id === nextFloorId);
    if (!nextFloor) {
      setSelectedSlot(null);
      return;
    }

    const slotStillOnFloor =
      selectedSlot?.floor._id === nextFloorId
        ? nextFloor.slots.find((slot) => slot._id === selectedSlot.slot._id) ?? null
        : null;

    if (slotStillOnFloor?.status === "AVAILABLE") {
      setSelectedSlot({ slot: slotStillOnFloor, floor: nextFloor });
      return;
    }

    const firstAvailable = nextFloor.slots.find((slot) => slot.status === "AVAILABLE") ?? null;
    setSelectedSlot(
      firstAvailable ? { slot: firstAvailable, floor: nextFloor } : null,
    );
  };

  const blockReason = vehicle
    ? getVehicleReserveBlockReason(
        vehicle._id,
        vehicle.licensePlate,
        reservations,
        vehicleParkingSessions,
      )
    : null;

  const handleSubmit = () => {
    if (!vehicle || !selectedSlot) {
      return;
    }

    const expectedArrival = parseExpectedArrival(expectedArrivalDate, expectedArrivalTime);
    if (!expectedArrival) {
      return;
    }

    onReserve({
      vehicleId: vehicle._id,
      parkingSlotId: selectedSlot.slot._id,
      expectedArrival: expectedArrival.toISOString(),
    });
  };

  const expectedArrival = parseExpectedArrival(expectedArrivalDate, expectedArrivalTime);
  const expectedArrivalError = getExpectedArrivalValidationMessage(expectedArrival);
  const isExpectedArrivalValid = expectedArrivalError === null && expectedArrival !== null;

  const availableCount = floorSlots.filter((slot) => slot.status === "AVAILABLE").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-card p-0">
        <div className="api-dialog-head shrink-0 px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Đặt chỗ đỗ xe</DialogTitle>
            <DialogDescription>
              Chọn chỗ trống và thời gian đến trong vòng 2 giờ tới.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {vehicle ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3">
              <div className="ui-field-icon size-10">
                <CarFront className="size-5" />
              </div>
              <div>
                <p className="font-mono text-sm font-semibold tracking-wide">
                  {vehicle.licensePlate}
                </p>
                <p className="text-xs text-muted-foreground">{vehicleTypeName}</p>
              </div>
            </div>
          ) : null}

          {blockReason ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {blockReason}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="driver-reserve-date">Ngày đến</Label>
              <Input
                id="driver-reserve-date"
                type="date"
                value={expectedArrivalDate}
                onChange={(event) => setExpectedArrivalDate(event.target.value)}
                min={getLocalDateInputValue()}
                max={maxExpectedArrivalDate}
                className="h-10 rounded-xl text-white [color-scheme:dark]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-reserve-time">Giờ đến</Label>
              <Input
                id="driver-reserve-time"
                type="time"
                value={expectedArrivalTime}
                onChange={(event) => setExpectedArrivalTime(event.target.value)}
                min={minExpectedArrivalTime}
                max={maxExpectedArrivalTime}
                className="h-10 rounded-xl text-white [color-scheme:dark]"
              />
            </div>
          </div>

          {expectedArrivalError && expectedArrivalDate && expectedArrivalTime ? (
            <p className="text-xs text-destructive">{expectedArrivalError}</p>
          ) : null}

          {matchingFloors.length === 0 ? (
            <DashboardEmptyState>Không có tầng cho loại xe này.</DashboardEmptyState>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {matchingFloors.map((floor) => {
                    const isActive = floor._id === floorId;
                    return (
                      <button
                        key={floor._id}
                        type="button"
                        onClick={() => handleFloorChange(floor._id)}
                        className={cn(
                          "rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors",
                          isActive
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border/70 bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                        )}
                      >
                        {floor.floorName}
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setIsSlotGridOpen((current) => !current)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                  isSlotGridOpen
                    ? "border-primary/45 bg-primary/10"
                    : "border-border/70 bg-secondary/35 hover:border-primary/30 hover:bg-primary/5",
                )}
              >
                <div className="ui-field-icon size-9 shrink-0">
                  <MapPin className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Chọn ô đỗ
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold">
                    {selectedSlot
                      ? `${selectedSlot.slot.slotNumber} · ${selectedSlot.floor.floorName}`
                      : "Bấm để chọn chỗ trống"}
                  </p>
                </div>
              </button>

              {isSlotGridOpen ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <DashboardLegend label={`AVAILABLE ${availableCount}`} tone="bg-status-empty" />
                    <DashboardLegend label="RESERVED" tone="bg-status-reserved" />
                    <DashboardLegend label="CURRENTLY-IN-USED" tone="bg-status-full" />
                    <DashboardLegend label="UNAVAILABLE" tone="bg-muted" />
                  </div>

                  {floorSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
                      {floorSlots.map((slot) => {
                        const isSelected = selectedSlot?.slot._id === slot._id;
                        const isAvailable = slot.status === "AVAILABLE";

                        return (
                          <button
                            key={slot._id}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => {
                              if (!selectedFloor || !isAvailable) {
                                return;
                              }
                              setSelectedSlot({ slot, floor: selectedFloor });
                            }}
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
              ) : null}
            </>
          )}

          {vehicleTypeId ? (
            <VehicleTypePricePanel
              vehicleTypeName={vehicleTypeName}
              policies={pricePolicies}
              monthlyRate={monthlyRate}
              isLoading={pricePoliciesQuery.isLoading}
              error={pricePoliciesQuery.isError}
            />
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border/70 px-6 py-4">
          <Button
            type="button"
            className="h-11 w-full rounded-xl text-sm font-semibold"
            disabled={
              isSubmitting ||
              !vehicle ||
              !selectedSlot ||
              Boolean(blockReason) ||
              !isExpectedArrivalValid
            }
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Đang đặt chỗ...
              </>
            ) : (
              <>
                <MapPin className="size-4" />
                Đặt chỗ
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getVehicleTypeId(vehicle: Vehicle): string | null {
  if (typeof vehicle.vehicleTypeId === "object") {
    return vehicle.vehicleTypeId._id ?? null;
  }
  return vehicle.vehicleTypeId ?? null;
}

function getVehicleTypeName(vehicle: Vehicle, vehicleTypes: VehicleType[]) {
  const typeId = getVehicleTypeId(vehicle);
  if (!typeId) {
    return "—";
  }
  return vehicleTypes.find((type) => type._id === typeId)?.type ?? "—";
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalTimeInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseExpectedArrival(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return null;
  }
  const parsed = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDefaultExpectedArrivalDate() {
  return getLocalDateInputValue();
}

function getDefaultExpectedArrivalTime() {
  return toLocalTimeInputValue(Date.now() + 60 * 60 * 1000);
}

type VehicleTypePricePanelProps = {
  vehicleTypeName: string;
  policies: PricePolicy[];
  monthlyRate: number | null;
  isLoading: boolean;
  error: boolean;
};

function VehicleTypePricePanel({
  vehicleTypeName,
  policies,
  monthlyRate,
  isLoading,
  error,
}: VehicleTypePricePanelProps) {
  return (
    <section className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Bảng giá · {vehicleTypeName}
      </p>

      {isLoading ? (
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" />
          Đang tải...
        </div>
      ) : error ? (
        <p className="mt-1.5 text-xs text-muted-foreground">Không thể tải bảng giá.</p>
      ) : policies.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">Chưa có bảng giá cho loại xe này.</p>
      ) : (
        <ul className="mt-1.5 space-y-0.5 text-xs">
          {policies.map((policy) => (
            <li
              key={policy._id}
              className="flex items-baseline justify-between gap-3 py-0.5"
            >
              <span className="text-muted-foreground">
                {formatPricePolicyHourRange(policy.fromHour, policy.toHour)}
              </span>
              <span className="shrink-0 font-medium text-foreground">
                {typeof policy.ratePerHour === "number"
                  ? `${formatVnd(policy.ratePerHour)}/giờ`
                  : "—"}
              </span>
            </li>
          ))}
          {monthlyRate ? (
            <li className="flex items-baseline justify-between gap-3 border-t border-border/50 pt-1">
              <span className="text-muted-foreground">Thẻ tháng</span>
              <span className="shrink-0 font-medium text-primary">
                {formatVnd(monthlyRate)}/tháng
              </span>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
