import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { ParkingSessionDetailDialog } from "@/components/ParkingSessionDetailDialog";
import { ReservationDetailDialog } from "@/components/ReservationDetailDialog";
import { StaffCreateParkingSessionDialog } from "@/components/StaffCreateParkingSessionDialog";
import { StaffWalkInCheckInDialog } from "@/components/staff/StaffWalkInCheckInDialog";
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
} from "@/components/dashboard-ui";
import { requireRole } from "@/lib/auth";
import { getLicensePlateBlockReason } from "@/lib/parking-validation";
import {
  checkoutParkingSession,
  createParkingSession,
  createGuestParkingSession,
  fetchStaffOccupancySessions,
  getCheckoutPhoneForSession,
  getFloorForParkingSlotId,
  getParkingFloors,
  getParkingSessionSlotId,
  getSessionLicensePlate,
  getSessionVehicleTypeLabel,
  mapParkingSessionsBySlotId,
  type ParkingFloor,
  type ParkingSession,
  type ParkingSlot,
  type ParkingSlotStatus,
} from "@/services/parking.service";
import {
  fetchAllReservationsPages,
  getCreateSessionDisabledReasonFromReservation,
  getReservationDriverName,
  getReservationSlotId,
  getReservationVehiclePlate,
  mapStaffSlotReservationsBySlotId,
  normalizeStaffPhone,
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
  const [viewingSessionSlotId, setViewingSessionSlotId] = useState<string | null>(null);
  const [createSessionSlot, setCreateSessionSlot] = useState<ParkingSlot | null>(null);
  const [createSessionDefaults, setCreateSessionDefaults] = useState({
    phone: "",
    licensePlate: "",
  });
  const [createSessionFromReservation, setCreateSessionFromReservation] = useState(false);
  const [createSessionDriverName, setCreateSessionDriverName] = useState<string | undefined>();
  const [createSessionAllowReservationId, setCreateSessionAllowReservationId] = useState<
    string | null
  >(null);
  const [walkInSlot, setWalkInSlot] = useState<ParkingSlot | null>(null);

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
    queryFn: () => fetchStaffOccupancySessions(),
    enabled: hasMounted,
  });

  const reservationsBySlotId = useMemo(
    () => mapStaffSlotReservationsBySlotId(reservationsQuery.data ?? []),
    [reservationsQuery.data],
  );

  const allReservations = reservationsQuery.data ?? [];
  const allParkingSessions = parkingSessionsQuery.data ?? [];

  const validateLicensePlateForNewActivity = (
    licensePlate: string,
    allowPendingReservationId?: string | null,
  ) =>
    getLicensePlateBlockReason(licensePlate, allReservations, allParkingSessions, {
      allowPendingReservationId: allowPendingReservationId ?? undefined,
    });

  const sessionsBySlotId = useMemo(
    () => mapParkingSessionsBySlotId(parkingSessionsQuery.data ?? []),
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

  const viewingSessionDetail = useMemo(() => {
    if (!viewingSessionSlotId) {
      return null;
    }

    const session = sessionsBySlotId.get(viewingSessionSlotId);
    if (!session) {
      return null;
    }

    const floor =
      getFloorForParkingSlotId(viewingSessionSlotId, parkingFloors) ?? selectedFloor;
    const slotNumber =
      selectedSlot && selectedSlot._id === viewingSessionSlotId
        ? selectedSlot.slotNumber
        : typeof session.parkingSlotId === "object"
          ? session.parkingSlotId.slotNumber
          : undefined;
    const licensePlate = getSessionLicensePlate(session);

    return {
      session,
      slotNumber,
      floorName: floor?.floorName ?? selectedFloor?.floorName,
      vehicleTypeLabel: getSessionVehicleTypeLabel(session, parkingFloors),
      licensePlateLabel: licensePlate,
    };
  }, [
    viewingSessionSlotId,
    sessionsBySlotId,
    parkingFloors,
    selectedFloor,
    selectedSlot,
  ]);

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

      queryClient.setQueryData(
        staffParkingSessionsQueryKey,
        (current: ParkingSession[] | undefined) => {
          const list = current ?? [];
          const sessionSlotId = getParkingSessionSlotId(session);
          if (!sessionSlotId) {
            return [...list, session];
          }
          return [
            ...list.filter((item) => getParkingSessionSlotId(item) !== sessionSlotId),
            session,
          ];
        },
      );

      const sessionSlotId = getParkingSessionSlotId(session);
      if (sessionSlotId) {
        setViewingSessionSlotId(sessionSlotId);
      }

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

  const createGuestSessionMutation = useMutation({
    mutationFn: createGuestParkingSession,
    onSuccess: async (session) => {
      setWalkInSlot(null);

      queryClient.setQueryData(
        staffParkingSessionsQueryKey,
        (current: ParkingSession[] | undefined) => {
          const list = current ?? [];
          const sessionSlotId = getParkingSessionSlotId(session);
          if (!sessionSlotId) {
            return [...list, session];
          }
          return [
            ...list.filter((item) => getParkingSessionSlotId(item) !== sessionSlotId),
            session,
          ];
        },
      );

      const sessionSlotId = getParkingSessionSlotId(session);
      if (sessionSlotId) {
        setViewingSessionSlotId(sessionSlotId);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffParkingSessionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: parkingFloorsQueryKey }),
      ]);

      const plate = getSessionLicensePlate(session) ?? "—";
      toast.success("Tạo parking session thành công", {
        description: `Khách vãng lai ${plate} đã check-in slot ${
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

  const checkoutSessionMutation = useMutation({
    mutationFn: checkoutParkingSession,
    onSuccess: async (session) => {
      setViewingSessionSlotId(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffParkingSessionsQueryKey }),
        queryClient.invalidateQueries({ queryKey: parkingFloorsQueryKey }),
        queryClient.invalidateQueries({ queryKey: staffReservationsQueryKey }),
      ]);

      const plate = getSessionLicensePlate(session) ?? "—";
      toast.success("Kết thúc phiên thành công", {
        description: `Xe ${plate} đã checkout. Slot trở về Available.`,
      });
    },
    onError: (error) => {
      toast.error("Không thể kết thúc phiên", {
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
      });
    },
  });

  const handleCheckoutSession = () => {
    const session = viewingSessionDetail?.session;
    if (!session?._id || session.status !== "ACTIVE") {
      return;
    }

    const phone = getCheckoutPhoneForSession(session);
    if (!phone) {
      toast.error("Không thể checkout", {
        description: "Phiên này không có SĐT khách — API checkout hiện yêu cầu SĐT tài khoản.",
      });
      return;
    }

    checkoutSessionMutation.mutate({
      parkingSessionId: session._id,
      phone,
    });
  };

  const openCreateSessionDialog = (
    slot: ParkingSlot,
    defaults: { phone?: string; licensePlate?: string } = {},
    fromReservation = false,
    driverName?: string,
    allowReservationId?: string | null,
  ) => {
    setViewingReservation(null);
    setViewingSessionSlotId(null);
    setCreateSessionFromReservation(fromReservation);
    setCreateSessionDriverName(fromReservation ? driverName : undefined);
    setCreateSessionAllowReservationId(allowReservationId ?? null);
    setCreateSessionDefaults({
      phone: defaults.phone ?? "",
      licensePlate: defaults.licensePlate ?? "",
    });
    setCreateSessionSlot(slot);
  };

  const handleOpenCreateSessionFromReservation = () => {
    if (!viewingReservation) {
      return;
    }

    const slotId = getReservationSlotId(viewingReservation);
    const slot =
      floorSlots.find((item) => item._id === slotId) ??
      (selectedSlot && selectedSlot._id === slotId ? selectedSlot : null);
    if (!slot) {
      toast.error("Không tìm thấy slot của reservation này.");
      return;
    }

    const phone = normalizeStaffPhone(
      typeof viewingReservation.driverId === "object"
        ? viewingReservation.driverId.phone
        : null,
    );
    const licensePlate = getReservationVehiclePlate(viewingReservation)?.trim() ?? "";

    openCreateSessionDialog(
      slot,
      {
        phone: phone ?? "",
        licensePlate,
      },
      true,
      getReservationDriverName(viewingReservation) ?? undefined,
      viewingReservation._id,
    );
  };

  const createSessionDisabledReason = viewingReservation
    ? getCreateSessionDisabledReasonFromReservation(viewingReservation)
    : undefined;

  const handleSlotClick = (slot: ParkingSlot) => {
    setSelectedSlotId(slot._id);

    const reservation = reservationsBySlotId.get(slot._id);
    const session = sessionsBySlotId.get(slot._id);

    if (slot.status === "CURRENTLY-IN-USED") {
      setViewingReservation(null);
      if (session) {
        setViewingSessionSlotId(slot._id);
        if (session.status === "COMPLETED") {
          toast.info("Phiên gửi xe đã checkout nhưng slot chưa về Available.", {
            description: "Liên hệ quản trị để đồng bộ lại slot nếu cần.",
          });
        }
      } else {
        toast.info("Slot đang IN-USED nhưng không tìm thấy parking session.", {
          description: "Có thể dữ liệu slot/session lệch — thử Refresh hoặc liên hệ quản trị.",
        });
      }
      return;
    }

    if (reservation) {
      setViewingSessionSlotId(null);
      setViewingReservation(reservation);
      return;
    }

    if (slot.status === "AVAILABLE") {
      setViewingReservation(null);
      setViewingSessionSlotId(null);
      setWalkInSlot(slot);
      return;
    }

    if (slot.status === "RESERVED") {
      toast.info("Slot đang Reserved nhưng chưa có thông tin đặt chỗ.", {
        description: "Có thể dữ liệu chưa đồng bộ — thử Refresh.",
      });
    }
  };

  const handleWalkInCreateSession = (licensePlate: string) => {
    const slot = walkInSlot ?? selectedSlot;
    if (!slot || slot.status !== "AVAILABLE") {
      toast.error("Slot không còn khả dụng.");
      return;
    }

    const blockReason = validateLicensePlateForNewActivity(licensePlate);
    if (blockReason) {
      toast.error("Không thể tạo session", { description: blockReason });
      return;
    }

    const floor =
      parkingFloors.find((item) => item.slots.some((s) => s._id === slot._id)) ?? selectedFloor;
    const vehicleTypeId = floor?.vehicleType?._id;
    if (!vehicleTypeId) {
      toast.error("Không xác định được loại xe của tầng.");
      return;
    }

    createGuestSessionMutation.mutate({
      licensePlate,
      parkingSlotId: slot._id,
      vehicleTypeId,
    });
  };

  const handleCreateSessionSubmit = (payload: {
    phone: string;
    licensePlate: string;
    parkingSlotId: string;
  }) => {
    const blockReason = validateLicensePlateForNewActivity(
      payload.licensePlate,
      createSessionAllowReservationId,
    );
    if (blockReason) {
      toast.error("Không thể tạo session", { description: blockReason });
      return;
    }

    createSessionMutation.mutate(payload);
  };

  const walkInFloor =
    walkInSlot &&
    (parkingFloors.find((floor) => floor.slots.some((s) => s._id === walkInSlot._id)) ??
      selectedFloor);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <DashboardMain wide>
        <DashboardSection>
          <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
            <DashboardLegend label={`Available ${availableCount}`} tone="bg-status-empty" />
            <DashboardLegend label={`Reserved ${reservedCount}`} tone="bg-status-reserved" />
            <DashboardLegend label={`Unavailable ${unavailableCount}`} tone="bg-status-maintenance" />
            <DashboardLegend label={`In used ${inUsedCount}`} tone="bg-status-full" />
          </div>

          <div className="grid gap-3 sm:grid-cols-[240px_auto]">
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
        showExpiryAt={false}
        onCreateSession={handleOpenCreateSessionFromReservation}
        isCreatingSession={false}
        createSessionDisabledReason={createSessionDisabledReason}
      />

      <ParkingSessionDetailDialog
        session={viewingSessionDetail?.session ?? null}
        slotNumber={viewingSessionDetail?.slotNumber}
        floorName={viewingSessionDetail?.floorName}
        vehicleTypeLabel={viewingSessionDetail?.vehicleTypeLabel}
        licensePlateLabel={viewingSessionDetail?.licensePlateLabel}
        showCheckoutAction={viewingSessionDetail?.session?.status === "ACTIVE"}
        onCheckout={handleCheckoutSession}
        isCheckingOut={checkoutSessionMutation.isPending}
        open={viewingSessionSlotId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingSessionSlotId(null);
          }
        }}
      />

      <StaffWalkInCheckInDialog
        open={walkInSlot !== null}
        onOpenChange={(open) => {
          if (!open) {
            setWalkInSlot(null);
          }
        }}
        slotNumber={walkInSlot?.slotNumber}
        floorName={walkInFloor?.floorName ?? selectedFloor?.floorName}
        vehicleTypeLabel={walkInFloor?.vehicleType?.type ?? selectedFloor?.vehicleType?.type}
        onCreateSession={handleWalkInCreateSession}
        isSubmitting={createGuestSessionMutation.isPending}
      />

      <StaffCreateParkingSessionDialog
        open={createSessionSlot !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateSessionSlot(null);
            setCreateSessionFromReservation(false);
            setCreateSessionDriverName(undefined);
            setCreateSessionAllowReservationId(null);
          }
        }}
        slotNumber={createSessionSlot?.slotNumber}
        floorName={selectedFloor?.floorName}
        parkingSlotId={createSessionSlot?._id ?? null}
        defaultPhone={createSessionDefaults.phone}
        defaultLicensePlate={createSessionDefaults.licensePlate}
        fromReservation={createSessionFromReservation}
        reservationDriverName={createSessionDriverName}
        onSubmit={handleCreateSessionSubmit}
        isSubmitting={createSessionMutation.isPending}
      />
    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function getSessionVehiclePlate(session: ParkingSession) {
  return getSessionLicensePlate(session) ?? "—";
}
