import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleDashed, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { ParkingSessionDetailDialog } from "@/components/ParkingSessionDetailDialog";
import { ReservationDetailDialog } from "@/components/ReservationDetailDialog";
import { StaffCreateParkingSessionDialog } from "@/components/StaffCreateParkingSessionDialog";
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
  createParkingSession,
  fetchActiveParkingSessions,
  getParkingFloors,
  mapActiveParkingSessionsBySlotId,
  type ParkingFloor,
  type ParkingSession,
  type ParkingSlot,
  type ParkingSlotStatus,
} from "@/services/parking.service";
import {
  fetchAllReservationsPages,
  getReservationSlotId,
  mapReservationsBySlotId,
  type Reservation,
} from "@/services/reservation.service";

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
const staffReservationsQueryKey = ["staff-reservations"] as const;
const staffParkingSessionsQueryKey = ["staff-parking-sessions"] as const;
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
  const queryClient = useQueryClient();
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [viewingReservation, setViewingReservation] = useState<Reservation | null>(null);
  const [viewingSession, setViewingSession] = useState<ParkingSession | null>(null);
  const [createSessionSlot, setCreateSessionSlot] = useState<ParkingSlot | null>(null);
  const [createSessionDefaults, setCreateSessionDefaults] = useState({
    phone: "",
    licensePlate: "",
  });

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const parkingFloorsQuery = useQuery({
    queryKey: parkingFloorsQueryKey,
    queryFn: () => getParkingFloors(),
    enabled: hasMounted,
  });

  const reservationsQuery = useQuery({
    queryKey: staffReservationsQueryKey,
    queryFn: () => fetchAllReservationsPages(),
    enabled: hasMounted,
  });

  const parkingSessionsQuery = useQuery({
    queryKey: staffParkingSessionsQueryKey,
    queryFn: () => fetchActiveParkingSessions(),
    enabled: hasMounted,
  });

  const reservationsBySlotId = useMemo(
    () => mapReservationsBySlotId(reservationsQuery.data ?? []),
    [reservationsQuery.data],
  );

  const sessionsBySlotId = useMemo(
    () => mapActiveParkingSessionsBySlotId(parkingSessionsQuery.data ?? []),
    [parkingSessionsQuery.data],
  );

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
  const selectedSlotReservation = selectedSlot
    ? (reservationsBySlotId.get(selectedSlot._id) ?? null)
    : null;
  const selectedSlotSession = selectedSlot ? (sessionsBySlotId.get(selectedSlot._id) ?? null) : null;

  const availableCount = floorSlots.filter((slot) => slot.status === "AVAILABLE").length;
  const unavailableCount = floorSlots.filter((slot) => slot.status === "UNAVAILABLE").length;
  const inUsedCount = floorSlots.filter((slot) => slot.status === "CURRENTLY-IN-USED").length;
  const reservedCount = floorSlots.filter((slot) => slot.status === "RESERVED").length;

  const parkingFloorsError = parkingFloorsQuery.error
    ? getErrorMessage(parkingFloorsQuery.error, "Unable to load parking slots.")
    : null;
  const occupancyDataError =
    reservationsQuery.error || parkingSessionsQuery.error
      ? getErrorMessage(
          reservationsQuery.error ?? parkingSessionsQuery.error,
          "Unable to load slot occupancy data.",
        )
      : null;
  const isRefreshing =
    parkingFloorsQuery.isFetching || reservationsQuery.isFetching || parkingSessionsQuery.isFetching;

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

  const handleRefresh = () => {
    void Promise.all([
      parkingFloorsQuery.refetch(),
      reservationsQuery.refetch(),
      parkingSessionsQuery.refetch(),
    ]);
  };

  const createSessionMutation = useMutation({
    mutationFn: createParkingSession,
    onSuccess: async (session) => {
      setViewingReservation(null);
      setCreateSessionSlot(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: parkingFloorsQueryKey }),
        queryClient.invalidateQueries({ queryKey: staffReservationsQueryKey }),
        queryClient.invalidateQueries({ queryKey: staffParkingSessionsQueryKey }),
      ]);
      toast.success("Tạo parking session thành công", {
        description: `Xe ${getSessionVehiclePlate(session)} đã check-in slot ${
          typeof session.parkingSlotId === "object"
            ? (session.parkingSlotId.slotNumber ?? "—")
            : "—"
        }.`,
      });
    },
    onError: (error) => {
      toast.error("Không thể tạo parking session", {
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
      });
    },
  });

  const openCreateSessionDialog = (
    slot: ParkingSlot,
    defaults: { phone?: string; licensePlate?: string } = {},
  ) => {
    setViewingReservation(null);
    setViewingSession(null);
    setCreateSessionDefaults({
      phone: defaults.phone ?? "",
      licensePlate: defaults.licensePlate ?? "",
    });
    setCreateSessionSlot(slot);
  };

  const handleCreateSessionFromReservation = () => {
    if (!viewingReservation || createSessionMutation.isPending) {
      return;
    }
    const payload = buildCreateSessionPayload(viewingReservation);
    if (!payload) {
      return;
    }
    createSessionMutation.mutate(payload);
  };

  const createSessionDisabledReason = viewingReservation
    ? getCreateSessionDisabledReason(viewingReservation)
    : undefined;

  const handleSlotClick = (slot: ParkingSlot) => {
    setSelectedSlotId(slot._id);

    const reservation = reservationsBySlotId.get(slot._id);
    const session = sessionsBySlotId.get(slot._id);

    if (reservation) {
      setViewingSession(null);
      setViewingReservation(reservation);
      return;
    }

    if (slot.status === "AVAILABLE" || slot.status === "RESERVED") {
      openCreateSessionDialog(slot);
      return;
    }

    if (slot.status === "CURRENTLY-IN-USED" && session) {
      setViewingReservation(null);
      setViewingSession(session);
      return;
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <DashboardMain wide>
        <DashboardSection>
          <DashboardSectionHeader
            kicker="Staff slot monitor"
            title={selectedFloor?.floorName ?? "Live parking slots"}
            description="Click slot Available/Reserved để tạo session, hoặc xem đặt chỗ / xe đang gửi."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <DashboardLegend label={`Available ${availableCount}`} tone="bg-status-empty" />
                <DashboardLegend label={`Reserved ${reservedCount}`} tone="bg-status-reserved" />
                <DashboardLegend label={`Unavailable ${unavailableCount}`} tone="bg-status-maintenance" />
                <DashboardLegend label={`In used ${inUsedCount}`} tone="bg-status-full" />
              </div>
            }
          />

          <div className="grid gap-3 sm:grid-cols-4">
            <DashboardStat label="Available" value={`${availableCount}`} tone="text-status-empty" />
            <DashboardStat label="Reserved" value={`${reservedCount}`} tone="text-status-reserved" />
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
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-11 rounded-xl"
              >
                <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {occupancyDataError ? (
            <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {occupancyDataError}
            </div>
          ) : null}

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
                    onClick={() => handleSlotClick(slot)}
                    className={`relative min-h-11 rounded-xl border px-2 py-2.5 text-left text-sm font-semibold transition ${
                      slotButtonStyles[slot.status]
                    } ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""} ${
                      slot.status === "AVAILABLE" ||
                      slot.status === "RESERVED" ||
                      slot.status === "CURRENTLY-IN-USED"
                        ? "cursor-pointer"
                        : ""
                    }`}
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
                  {selectedSlotReservation
                    ? "Slot có đặt chỗ — click lại để xem chi tiết."
                    : selectedSlotSession
                      ? "Slot đang có xe gửi — click lại để xem chi tiết."
                      : selectedSlot.status === "AVAILABLE" || selectedSlot.status === "RESERVED"
                        ? "Có thể tạo parking session cho slot này."
                        : selectedSlot.status === "CURRENTLY-IN-USED"
                          ? "Chưa có dữ liệu chi tiết cho slot này."
                          : "Slot không khả dụng."}
                </p>
              </div>

              {selectedSlot.status === "AVAILABLE" || selectedSlot.status === "RESERVED" ? (
                <Button
                  type="button"
                  className="mt-4 rounded-xl"
                  onClick={() => {
                    if (selectedSlotReservation) {
                      setViewingReservation(selectedSlotReservation);
                      return;
                    }
                    openCreateSessionDialog(selectedSlot);
                  }}
                >
                  {selectedSlotReservation ? "Xem đặt chỗ / tạo session" : "Tạo parking session"}
                </Button>
              ) : null}
            </div>
          ) : (
            <DashboardEmptyState>
              <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border border-border bg-card">
                <MapPin className="size-6 text-muted-foreground" />
              </div>
              <h4 className="text-lg font-semibold text-foreground">No slot selected</h4>
              <p className="mt-2">Click slot đã đặt hoặc đang sử dụng để xem thông tin.</p>
            </DashboardEmptyState>
          )}
        </DashboardSection>
      </DashboardMain>

      <ReservationDetailDialog
        reservation={viewingReservation}
        open={viewingReservation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingReservation(null);
          }
        }}
        showCreateSessionAction
        onCreateSession={handleCreateSessionFromReservation}
        isCreatingSession={createSessionMutation.isPending}
        createSessionDisabledReason={createSessionDisabledReason}
      />

      <ParkingSessionDetailDialog
        session={viewingSession}
        slotNumber={selectedSlot?.slotNumber}
        floorName={selectedFloor?.floorName}
        open={viewingSession !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingSession(null);
          }
        }}
      />

      <StaffCreateParkingSessionDialog
        open={createSessionSlot !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateSessionSlot(null);
          }
        }}
        slotNumber={createSessionSlot?.slotNumber}
        floorName={selectedFloor?.floorName}
        parkingSlotId={createSessionSlot?._id ?? null}
        defaultPhone={createSessionDefaults.phone}
        defaultLicensePlate={createSessionDefaults.licensePlate}
        onSubmit={(payload) => createSessionMutation.mutate(payload)}
        isSubmitting={createSessionMutation.isPending}
      />
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getReservationDriverPhone(reservation: Reservation) {
  if (typeof reservation.driverId === "object") {
    return reservation.driverId.phone ?? null;
  }
  return null;
}

function getReservationVehiclePlate(reservation: Reservation) {
  if (typeof reservation.vehicleId === "object") {
    return reservation.vehicleId.licensePlate ?? null;
  }
  return null;
}

function buildCreateSessionPayload(reservation: Reservation) {
  const phone = getReservationDriverPhone(reservation);
  const licensePlate = getReservationVehiclePlate(reservation);
  const parkingSlotId = getReservationSlotId(reservation);
  if (!phone || !licensePlate || !parkingSlotId) {
    return null;
  }
  return { phone, licensePlate, parkingSlotId };
}

function getCreateSessionDisabledReason(reservation: Reservation) {
  if (reservation.status !== "PENDING") {
    return "Chỉ tạo session từ reservation đang PENDING.";
  }

  const phone = getReservationDriverPhone(reservation);
  const licensePlate = getReservationVehiclePlate(reservation);
  const parkingSlotId = getReservationSlotId(reservation);

  if (!parkingSlotId) {
    return "Không xác định được slot.";
  }
  if (!phone) {
    return "Reservation thiếu số điện thoại khách.";
  }
  if (!/^(03|05|07|08|09)\d{8}$/.test(phone)) {
    return "Số điện thoại không đúng định dạng (03/05/07/08/09 + 8 số).";
  }
  if (!licensePlate) {
    return "Reservation thiếu biển số xe.";
  }

  return undefined;
}

function getSessionVehiclePlate(session: ParkingSession) {
  if (typeof session.vehicleId === "object") {
    return session.vehicleId.licensePlate ?? "—";
  }
  return "—";
}
