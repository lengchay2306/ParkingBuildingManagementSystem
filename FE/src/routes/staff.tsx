import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CircleDashed, LoaderCircle, MapPin, RefreshCw } from "lucide-react";

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
  UNAVAILABLE: "Unavailable",
  "CURRENTLY-IN-USED": "Currently in used",
};

const slotButtonStyles: Record<ParkingSlotStatus, string> = {
  AVAILABLE:
    "border-status-empty/40 bg-status-empty/10 text-status-empty hover:border-status-empty/70 hover:-translate-y-0.5",
  UNAVAILABLE:
    "border-border bg-background/55 text-muted-foreground opacity-80 hover:border-border/80",
  "CURRENTLY-IN-USED":
    "border-status-full/40 bg-status-full/12 text-status-full opacity-90 hover:border-status-full/70",
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
      <main className="mx-auto w-full max-w-[1320px] px-4 pb-12 pt-6 md:px-6">
        <section className="rounded-3xl border border-border/75 bg-card/75 p-5 shadow-soft md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Staff slot monitor
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {selectedFloor?.floorName ?? "Live parking slots"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                View parking slots by floor only. Reservation actions are disabled for staff.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Legend label={`Available ${availableCount}`} tone="bg-status-empty" />
              <Legend label={`Unavailable ${unavailableCount}`} tone="bg-status-maintenance" />
              <Legend label={`In used ${inUsedCount}`} tone="bg-status-full" />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[240px_auto]">
            <div className="space-y-2">
              <Label htmlFor="staff-floor-filter">Floor</Label>
              <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
                <SelectTrigger id="staff-floor-filter" className="h-10 rounded-xl">
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
                className="h-10 rounded-xl"
              >
                <RefreshCw
                  className={`size-4 ${parkingFloorsQuery.isFetching ? "animate-spin" : ""}`}
                />
                Refresh slots
              </Button>
            </div>
          </div>

          {parkingFloorsQuery.isLoading ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading floor slots...
            </div>
          ) : parkingFloorsError ? (
            <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {parkingFloorsError}
            </div>
          ) : floorSlots.length > 0 ? (
            <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 xl:grid-cols-10">
              {floorSlots.map((slot) => {
                const isSelected = selectedSlotId === slot._id;
                return (
                  <button
                    key={slot._id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot._id)}
                    className={`relative rounded-lg border p-2 text-left text-xs font-medium transition ${
                      slotButtonStyles[slot.status]
                    } ${isSelected ? "ring-2 ring-foreground" : "ring-1 ring-transparent"} cursor-pointer`}
                    aria-label={`${slot.slotNumber} (${slotStatusText[slot.status]})`}
                  >
                    <span className="font-mono text-[11px]">{slot.slotNumber}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/35 px-4 py-3 text-sm text-muted-foreground">
              No slots found for this floor.
            </div>
          )}
        </section>

        <section className="mt-6">
          <aside className="rounded-3xl border border-border/75 bg-card/70 p-5 shadow-soft">
            {selectedSlot ? (
              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold tracking-tight">
                    {selectedSlot.slotNumber}
                  </h4>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                    {slotStatusText[selectedSlot.status]}
                  </span>
                </div>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p className="inline-flex items-center gap-2">
                    <CircleDashed className="size-4" />
                    {selectedFloor?.floorName ?? "Floor"}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <MapPin className="size-4" />
                    Slot monitoring only
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-background/35 p-6 text-center">
                <div>
                  <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border border-border bg-background">
                    <MapPin className="size-6 text-muted-foreground" />
                  </div>
                  <h4 className="text-xl font-semibold tracking-tight">No slot selected</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click any slot to view details.
                  </p>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function Legend({ label, tone }: { label: string; tone: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
      <span className={`size-2 rounded-full ${tone}`} />
      {label}
    </span>
  );
}
