import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CircleDashed, MapPin, RefreshCw } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DashboardEmptyState,
  DashboardLegend,
  DashboardLoadingState,
  DashboardMain,
  DashboardSection,
  DashboardSectionHeader,
  DashboardStat,
} from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";
import {
  getParkingFloors,
  type ParkingFloor,
  type ParkingSlot,
  type ParkingSlotStatus,
} from "@/services/parking.service";

export const Route = createFileRoute("/staff")({
  beforeLoad: async () => {
    await requireRole("STAFF");
  },
  head: () => ({
    meta: [
      { title: "Staff Console — PARKOS" },
      {
        name: "description",
        content: "Staff console to view parking slots by floor in real time.",
      },
    ],
  }),
  component: StaffPage,
});

const parkingFloorsQueryKey = ["staff-parking-floors"] as const;
const emptyParkingFloors: ParkingFloor[] = [];
const emptyParkingSlots: ParkingSlot[] = [];

const slotStatusText: Record<ParkingSlotStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  UNAVAILABLE: "Unavailable",
  "CURRENTLY-IN-USED": "Currently in used",
};

const slotButtonStyles: Record<ParkingSlotStatus, string> = {
  AVAILABLE:
    "border-status-empty/50 bg-status-empty/15 text-status-empty hover:border-status-empty hover:bg-status-empty/20",
  RESERVED:
    "border-status-reserved/50 bg-status-reserved/15 text-status-reserved hover:border-status-reserved/70",
  UNAVAILABLE:
    "border-border bg-secondary text-muted-foreground hover:border-border",
  "CURRENTLY-IN-USED":
    "border-status-full/50 bg-status-full/15 text-status-full hover:border-status-full/70",
};

function StaffPage() {
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const parkingFloorsQuery = useQuery({
    queryKey: parkingFloorsQueryKey,
    queryFn: () => getParkingFloors(),
    enabled: hasMounted,
  });

  const parkingFloors = parkingFloorsQuery.data ?? emptyParkingFloors;
  const selectedFloor = useMemo(() => {
    if (parkingFloors.length === 0) {
      return null;
    }
    return parkingFloors.find((floor) => floor._id === selectedFloorId) ?? parkingFloors[0] ?? null;
  }, [parkingFloors, selectedFloorId]);
  const floorSlots = selectedFloor?.slots ?? emptyParkingSlots;
  const selectedSlot = useMemo(
    () => floorSlots.find((slot) => slot._id === selectedSlotId) ?? null,
    [floorSlots, selectedSlotId],
  );

  const availableCount = floorSlots.filter((slot) => slot.status === "AVAILABLE").length;
  const unavailableCount = floorSlots.filter((slot) => slot.status === "UNAVAILABLE").length;
  const inUsedCount = floorSlots.filter((slot) => slot.status === "CURRENTLY-IN-USED").length;

  const parkingFloorsError = parkingFloorsQuery.error
    ? getErrorMessage(parkingFloorsQuery.error, "Unable to load parking slots.")
    : null;

  useEffect(() => {
    if (parkingFloors.length === 0) {
      return;
    }
    const selectedFloorStillExists = parkingFloors.some((floor) => floor._id === selectedFloorId);
    if (!selectedFloorStillExists) {
      setSelectedFloorId(parkingFloors[0]._id);
    }
  }, [parkingFloors, selectedFloorId]);

  useEffect(() => {
    setSelectedSlotId(null);
  }, [selectedFloorId]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <DashboardMain wide>
        <DashboardSection>
          <DashboardSectionHeader
            kicker="Staff slot monitor"
            title={selectedFloor?.floorName ?? "Live parking slots"}
            description="Xem trạng thái slot theo tầng. Staff không thực hiện đặt chỗ."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <DashboardLegend label={`Available ${availableCount}`} tone="bg-status-empty" />
                <DashboardLegend label={`Unavailable ${unavailableCount}`} tone="bg-status-maintenance" />
                <DashboardLegend label={`In used ${inUsedCount}`} tone="bg-status-full" />
              </div>
            }
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <DashboardStat label="Available" value={`${availableCount}`} tone="text-status-empty" />
            <DashboardStat label="Unavailable" value={`${unavailableCount}`} />
            <DashboardStat label="In used" value={`${inUsedCount}`} tone="text-status-full" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[240px_auto]">
            <div className="space-y-2">
              <Label htmlFor="staff-floor-filter">Floor</Label>
              <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
                <SelectTrigger id="staff-floor-filter" className="h-11 rounded-xl bg-secondary">
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  {parkingFloors.map((floor) => (
                    <SelectItem key={floor._id} value={floor._id}>
                      {floor.floorName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void parkingFloorsQuery.refetch()}
                disabled={parkingFloorsQuery.isFetching}
                className="h-11 rounded-xl"
              >
                <RefreshCw
                  className={`size-4 ${parkingFloorsQuery.isFetching ? "animate-spin" : ""}`}
                />
                Refresh slots
              </Button>
            </div>
          </div>

          {parkingFloorsQuery.isLoading ? (
            <div className="mt-5">
              <DashboardLoadingState label="Loading floor slots..." />
            </div>
          ) : parkingFloorsError ? (
            <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {parkingFloorsError}
            </div>
          ) : floorSlots.length > 0 ? (
            <div className="mt-5 grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {floorSlots.map((slot) => {
                const isSelected = selectedSlotId === slot._id;
                return (
                  <button
                    key={slot._id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot._id)}
                    className={`relative min-h-11 rounded-xl border px-2 py-2.5 text-left text-sm font-semibold transition ${
                      slotButtonStyles[slot.status]
                    } ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
                    aria-label={`${slot.slotNumber} (${slotStatusText[slot.status]})`}
                  >
                    <span className="font-mono text-xs">{slot.slotNumber}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <DashboardEmptyState>No slots found for this floor.</DashboardEmptyState>
            </div>
          )}
        </DashboardSection>

        <DashboardSection compact>
          {selectedSlot ? (
            <div className="rounded-xl border border-border bg-secondary p-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xl font-semibold tracking-tight">{selectedSlot.slotNumber}</h4>
                <span className="rounded-full border border-border bg-card px-3 py-1 text-sm font-medium">
                  {slotStatusText[selectedSlot.status]}
                </span>
              </div>
              <div className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                <p className="inline-flex items-center gap-2">
                  <CircleDashed className="size-4 shrink-0" />
                  {selectedFloor?.floorName ?? "Floor"}
                </p>
                <p className="inline-flex items-center gap-2">
                  <MapPin className="size-4 shrink-0" />
                  Slot monitoring only
                </p>
              </div>
            </div>
          ) : (
            <DashboardEmptyState>
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border border-border bg-card">
                <MapPin className="size-6 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">No slot selected</h4>
              <p className="mt-2">Click any slot to view details.</p>
            </DashboardEmptyState>
          )}
        </DashboardSection>
      </DashboardMain>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
