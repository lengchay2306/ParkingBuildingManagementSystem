import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  CarFront,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import {
  DashboardEmptyState,
  DashboardLegend,
  DashboardMain,
  DashboardSection,
  DashboardSectionHeader,
} from "@/components/dashboard-ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import {
  cancelReservation,
  createReservation,
  getMyReservations,
  getReservationSlotId,
  type Reservation,
} from "@/services/reservation.service";
import {
  createVehicle,
  getMyVehicles,
  getVehicleTypes,
  softDeleteMyVehicle,
  updateMyVehicle,
  type Vehicle,
  type VehicleType,
} from "@/services/vehicle.service";
import { getMyProfile, updateMyProfile, type UserProfile } from "@/services/user.service";

export const Route = createFileRoute("/driver")({
  beforeLoad: async () => {
    await requireRole("CUSTOMER");
  },
  head: () => ({
    meta: [
      { title: "Driver Portal - PARKOS" },
      {
        name: "description",
        content:
          "Driver portal to view parking information, reserve slots, track active sessions, make payments, and submit feedback or incident reports.",
      },
      { property: "og:title", content: "Driver Portal - PARKOS" },
      {
        property: "og:description",
        content:
          "View parking status in real time, reserve supported slots, track active parking sessions, pay, and report issues.",
      },
    ],
  }),
  component: DriverPage,
});

type QuickAction = {
  id: "reserve" | "my-reservations";
  title: string;
  icon: LucideIcon;
  highlighted?: boolean;
};

const quickActions: QuickAction[] = [
  {
    id: "reserve",
    title: "Reserve Parking Slot",
    icon: MapPin,
    highlighted: true,
  },
  {
    id: "my-reservations",
    title: "My Reservations",
    icon: Clock3,
  },
];

const reservedByYouButtonStyle =
  "border-status-yours/50 bg-status-yours/15 text-status-yours";
const reservedByYouBadgeStyle =
  "border-status-yours/45 bg-status-yours/15 text-status-yours";

const slotStatusText: Record<ParkingSlotStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  UNAVAILABLE: "Unavailable",
  "CURRENTLY-IN-USED": "Currently in used",
};

const slotStatusBadge: Record<ParkingSlotStatus, string> = {
  AVAILABLE: "bg-status-empty/20 text-status-empty border-status-empty/40",
  RESERVED: "bg-status-reserved/15 text-status-reserved border-status-reserved/45",
  UNAVAILABLE: "bg-muted text-muted-foreground border-border",
  "CURRENTLY-IN-USED": "bg-status-full/20 text-status-full border-status-full/45",
};

const slotButtonStyles: Record<ParkingSlotStatus, string> = {
  AVAILABLE:
    "border-status-empty/50 bg-status-empty/15 text-status-empty hover:border-status-empty hover:bg-status-empty/20",
  RESERVED:
    "cursor-not-allowed border-status-reserved/50 bg-status-reserved/15 text-status-reserved opacity-70",
  UNAVAILABLE: "cursor-not-allowed border-border bg-secondary text-muted-foreground",
  "CURRENTLY-IN-USED":
    "cursor-not-allowed border-status-full/50 bg-status-full/15 text-status-full",
};

const vehicleTypesQueryKey = ["vehicle-types"] as const;
const myVehiclesQueryKey = ["my-vehicles"] as const;
const myProfileQueryKey = ["my-profile"] as const;
const parkingFloorsQueryKey = ["parking-floors"] as const;
const myReservationsQueryKey = ["my-reservations"] as const;
const emptyVehicleTypes: VehicleType[] = [];
const emptyVehicles: Vehicle[] = [];
const emptyParkingFloors: ParkingFloor[] = [];
const emptyParkingSlots: ParkingSlot[] = [];
const emptyReservations: Reservation[] = [];

function DriverPage() {
  const queryClient = useQueryClient();
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");
  const [selectedReservationVehicleId, setSelectedReservationVehicleId] = useState<string>("");
  const [activeQuickAction, setActiveQuickAction] = useState<QuickAction["id"] | null>(null);
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const [isEditVehicleOpen, setIsEditVehicleOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editVehicleLicensePlate, setEditVehicleLicensePlate] = useState("");
  const [editVehicleTypeId, setEditVehicleTypeId] = useState("");
  const [editVehicleError, setEditVehicleError] = useState<string | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [isVehiclesExpanded, setIsVehiclesExpanded] = useState(false);
  const [reservationHistoryDate, setReservationHistoryDate] = useState(() => getLocalDateInputValue());
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(getDefaultExpectedArrivalDate);
  const [expectedArrivalTime, setExpectedArrivalTime] = useState(getDefaultExpectedArrivalTime);
  const minExpectedArrivalTime =
    expectedArrivalDate === getLocalDateInputValue()
      ? toLocalTimeInputValue(Date.now() + 60_000)
      : undefined;
  const reserveSectionRef = useRef<HTMLDivElement | null>(null);
  const reservationSectionRef = useRef<HTMLElement | null>(null);
  const vehiclesSectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const node = vehiclesSectionRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          setIsVehiclesExpanded(true);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const profileQuery = useQuery({
    queryKey: myProfileQueryKey,
    queryFn: getMyProfile,
    enabled: hasMounted,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const vehicleTypesQuery = useQuery({
    queryKey: vehicleTypesQueryKey,
    queryFn: getVehicleTypes,
    enabled: hasMounted,
  });
  const vehiclesQuery = useQuery({
    queryKey: myVehiclesQueryKey,
    queryFn: getMyVehicles,
    enabled: hasMounted,
  });
  const parkingFloorsQuery = useQuery({
    queryKey: parkingFloorsQueryKey,
    queryFn: () => getParkingFloors(),
    enabled: hasMounted,
  });
  const myReservationsQuery = useQuery({
    queryKey: myReservationsQueryKey,
    queryFn: () => getMyReservations(),
    enabled: hasMounted,
  });

  const createVehicleMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async (vehicle) => {
      setLicensePlate("");
      setVehicleFormError(null);
      setIsVehicleFormOpen(false);
      toast.success("Vehicle registered", {
        description: `${vehicle.licensePlate} has been added to your account.`,
      });
      await queryClient.invalidateQueries({ queryKey: myVehiclesQueryKey });
    },
    onError: (error) => {
      setVehicleFormError(getErrorMessage(error, "Unable to register vehicle."));
    },
  });
  const updateVehicleMutation = useMutation({
    mutationFn: ({
      vehicleId,
      payload,
    }: {
      vehicleId: string;
      payload: { licensePlate?: string; vehicleTypeId?: string };
    }) => updateMyVehicle(vehicleId, payload),
    onSuccess: async (updatedVehicle) => {
      setEditVehicleError(null);
      setIsEditVehicleOpen(false);
      setEditingVehicle(null);
      setEditVehicleLicensePlate("");
      setEditVehicleTypeId("");
      toast.success("Vehicle updated", {
        description: `${updatedVehicle.licensePlate} has been updated.`,
      });
      await queryClient.invalidateQueries({ queryKey: myVehiclesQueryKey });
    },
    onError: (error) => {
      setEditVehicleError(getErrorMessage(error, "Unable to update vehicle."));
    },
  });
  const deleteVehicleMutation = useMutation({
    mutationFn: softDeleteMyVehicle,
    onSuccess: async (deletedVehicle) => {
      setDeletingVehicleId(null);
      toast.success("Đã xóa xe", {
        description: `${deletedVehicle.licensePlate} đã chuyển sang trạng thái INACTIVE.`,
      });
      await queryClient.invalidateQueries({ queryKey: myVehiclesQueryKey });
    },
    onError: (error) => {
      setDeletingVehicleId(null);
      toast.error("Không thể xóa xe", {
        description: getErrorMessage(error, "Vui lòng thử lại."),
      });
    },
  });
  const updateProfileMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async (updatedUser) => {
      setEditProfileError(null);
      setIsEditProfileOpen(false);
      queryClient.setQueryData(myProfileQueryKey, updatedUser);
      await queryClient.invalidateQueries({ queryKey: myProfileQueryKey });
      toast.success("Cập nhật thành công", {
        description: "Thông tin hồ sơ của bạn đã được cập nhật.",
      });
    },
    onError: (error) => {
      const message = getErrorMessage(error, "Không thể cập nhật hồ sơ.");
      setEditProfileError(message);
      toast.error("Cập nhật thất bại", { description: message });
    },
  });
  const reserveSlotMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: async (reservation) => {
      const reservationSlotId = getReservationSlotId(reservation);
      const reservedSlotLabel =
        reservationSlotId && floorSlots.some((slot) => slot._id === reservationSlotId)
          ? floorSlots.find((slot) => slot._id === reservationSlotId)?.slotNumber
          : selectedSpot?.slotNumber;
      toast.success("Reservation created", {
        description: `${reservedSlotLabel ?? "The selected slot"} has been reserved successfully.`,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myReservationsQueryKey }),
        queryClient.invalidateQueries({ queryKey: parkingFloorsQueryKey }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to reserve slot", {
        description: getErrorMessage(error, "Please check reservation data and try again."),
      });
    },
  });
  const cancelReservationMutation = useMutation({
    mutationFn: cancelReservation,
    onSuccess: async () => {
      toast.success("Reservation cancelled", {
        description: "The selected reservation has been cancelled.",
      });
      setSelectedSpotId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: myReservationsQueryKey }),
        queryClient.invalidateQueries({ queryKey: parkingFloorsQueryKey }),
      ]);
    },
    onError: (error) => {
      toast.error("Unable to cancel reservation", {
        description: getErrorMessage(error, "Please try again."),
      });
    },
  });

  const parkingFloors = parkingFloorsQuery.data ?? emptyParkingFloors;
  const selectedFloor = useMemo(() => {
    if (parkingFloors.length === 0) {
      return null;
    }
    return parkingFloors.find((floor) => floor._id === selectedFloorId) ?? parkingFloors[0] ?? null;
  }, [parkingFloors, selectedFloorId]);
  const floorSlots = selectedFloor?.slots ?? emptyParkingSlots;
  const selectedSpot = useMemo(
    () => floorSlots.find((slot) => slot._id === selectedSpotId) ?? null,
    [floorSlots, selectedSpotId],
  );
  const vehicleTypes = vehicleTypesQuery.data ?? emptyVehicleTypes;
  const vehicles = vehiclesQuery.data ?? emptyVehicles;
  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.status !== "INACTIVE"),
    [vehicles],
  );
  const reservations = myReservationsQuery.data ?? emptyReservations;
  const filteredHistoryReservations = useMemo(
    () =>
      reservations.filter((reservation) =>
        reservationMatchesDateFilter(reservation, reservationHistoryDate),
      ),
    [reservations, reservationHistoryDate],
  );
  const myPendingReservations = reservations.filter(
    (reservation) => reservation.status === "PENDING",
  );
  const reservationBySlotId = useMemo(() => {
    const map = new Map<string, Reservation>();
    for (const reservation of myPendingReservations) {
      const slotId = getReservationSlotId(reservation);
      if (slotId) {
        map.set(slotId, reservation);
      }
    }
    return map;
  }, [myPendingReservations]);
  const selectedReservation = selectedSpot
    ? (reservationBySlotId.get(selectedSpot._id) ?? null)
    : null;
  const selectedFloorVehicleTypeId = selectedFloor?.vehicleType?._id ?? null;
  const compatibleVehicles = useMemo(
    () =>
      activeVehicles.filter((vehicle) => {
        const typeId = getVehicleTypeId(vehicle);
        if (!selectedFloorVehicleTypeId) {
          return Boolean(typeId);
        }
        return typeId === selectedFloorVehicleTypeId;
      }),
    [activeVehicles, selectedFloorVehicleTypeId],
  );
  const selectedReservationVehicle = compatibleVehicles.find(
    (vehicle) => vehicle._id === selectedReservationVehicleId,
  );
  const profile = profileQuery.data ?? null;

  const availableCount = floorSlots.filter((slot) => slot.status === "AVAILABLE").length;
  const reservedCount = floorSlots.filter((slot) => slot.status === "RESERVED").length;
  const unavailableCount = floorSlots.filter((slot) => slot.status === "UNAVAILABLE").length;
  const inUsedCount = floorSlots.filter((slot) => slot.status === "CURRENTLY-IN-USED").length;

  const isVehicleTypeLoading = vehicleTypesQuery.isLoading && vehicleTypes.length === 0;

  useEffect(() => {
    const selectedTypeStillExists = vehicleTypes.some((type) => type._id === vehicleTypeId);
    if (vehicleTypes.length > 0 && (!vehicleTypeId || !selectedTypeStillExists)) {
      setVehicleTypeId(vehicleTypes[0]._id);
    }
  }, [vehicleTypeId, vehicleTypes]);

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
    setSelectedSpotId(null);
  }, [selectedFloorId]);

  useEffect(() => {
    if (compatibleVehicles.length === 0) {
      setSelectedReservationVehicleId("");
      return;
    }

    const selectedVehicleStillCompatible = compatibleVehicles.some(
      (vehicle) => vehicle._id === selectedReservationVehicleId,
    );
    if (!selectedVehicleStillCompatible) {
      setSelectedReservationVehicleId(compatibleVehicles[0]._id);
    }
  }, [compatibleVehicles, selectedReservationVehicleId]);

  const handleVehicleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVehicleFormError(null);

    const normalizedPlate = licensePlate.trim().replace(/\s+/g, " ").toUpperCase();
    if (normalizedPlate.length < 4) {
      setVehicleFormError("Enter a valid license plate.");
      return;
    }
    if (!vehicleTypeId || vehicleTypes.length === 0) {
      setVehicleFormError(
        vehicleTypes.length === 0
          ? "Vehicle types are not available from backend yet. Refresh vehicle types and try again."
          : "Choose a vehicle type.",
      );
      return;
    }

    createVehicleMutation.mutate({
      licensePlate: normalizedPlate,
      vehicleTypeId,
    });
  };

  const handleDeleteVehicle = (vehicle: Vehicle) => {
    const confirmed = window.confirm(
      `Xóa xe ${vehicle.licensePlate}?\n\nXe sẽ chuyển sang trạng thái INACTIVE (soft delete), không bị xóa vĩnh viễn khỏi hệ thống.`,
    );
    if (!confirmed) {
      return;
    }
    setDeletingVehicleId(vehicle._id);
    deleteVehicleMutation.mutate(vehicle._id);
  };

  const handleEditVehicleOpenChange = (open: boolean) => {
    setIsEditVehicleOpen(open);
    if (!open) {
      setEditingVehicle(null);
      setEditVehicleError(null);
      setEditVehicleLicensePlate("");
      setEditVehicleTypeId("");
    }
  };

  const handleStartEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditVehicleError(null);
    setEditVehicleLicensePlate(vehicle.licensePlate);
    setEditVehicleTypeId(getVehicleTypeId(vehicle) ?? "");
    setIsEditVehicleOpen(true);

    if (vehicleTypes.length === 0 && !vehicleTypesQuery.isFetching) {
      void vehicleTypesQuery.refetch();
    }
  };

  const handleEditVehicleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingVehicle) {
      return;
    }
    setEditVehicleError(null);

    const normalizedPlate = editVehicleLicensePlate.trim().replace(/\s+/g, " ").toUpperCase();
    if (normalizedPlate.length < 4) {
      setEditVehicleError("Enter a valid license plate.");
      return;
    }
    if (!editVehicleTypeId) {
      setEditVehicleError("Choose a vehicle type.");
      return;
    }

    const payload: { licensePlate?: string; vehicleTypeId?: string } = {};
    if (normalizedPlate !== editingVehicle.licensePlate.toUpperCase()) {
      payload.licensePlate = normalizedPlate;
    }

    const currentVehicleTypeId = getVehicleTypeId(editingVehicle);
    if (editVehicleTypeId !== currentVehicleTypeId) {
      payload.vehicleTypeId = editVehicleTypeId;
    }

    if (Object.keys(payload).length === 0) {
      setEditVehicleError("You have not changed any vehicle data.");
      return;
    }

    updateVehicleMutation.mutate({
      vehicleId: editingVehicle._id,
      payload,
    });
  };

  const vehicleListError = vehiclesQuery.error
    ? getErrorMessage(vehiclesQuery.error, "Unable to load registered vehicles.")
    : null;
  const vehicleTypeError = vehicleTypesQuery.error
    ? getErrorMessage(vehicleTypesQuery.error, "Unable to load vehicle types.")
    : null;
  const profileError = profileQuery.error
    ? getErrorMessage(profileQuery.error, "Unable to load profile.")
    : null;
  const parkingFloorsError = parkingFloorsQuery.error
    ? getErrorMessage(parkingFloorsQuery.error, "Unable to load parking slots.")
    : null;

  const handleVehicleFormOpenChange = (open: boolean) => {
    setIsVehicleFormOpen(open);
    if (open) {
      setVehicleFormError(null);
      if (vehicleTypes.length === 0 && !vehicleTypesQuery.isFetching) {
        void vehicleTypesQuery.refetch();
      }
    }
  };

  const handleProfileOpenChange = (open: boolean) => {
    setIsProfileOpen(open);
    if (open) {
      void profileQuery.refetch();
    }
  };

  const handleEditProfileOpenChange = (open: boolean) => {
    setIsEditProfileOpen(open);
    if (open) {
      setEditProfileError(null);
      setEditFullName(profile?.fullName ?? "");
      setEditPhone(profile?.phone ?? "");
    }
  };

  const handleEditProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditProfileError(null);

    const fullName = editFullName.trim();
    const phone = editPhone.trim();

    if (fullName.length < 2 || fullName.length > 30) {
      setEditProfileError("Họ tên phải từ 2 đến 30 kí tự.");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)) {
      setEditProfileError("Số điện thoại phải gồm đúng 10 chữ số.");
      return;
    }

    const payload: { fullName?: string; phone?: string } = {};
    if (fullName !== profile?.fullName) {
      payload.fullName = fullName;
    }
    if (phone !== profile?.phone) {
      payload.phone = phone;
    }

    if (Object.keys(payload).length === 0) {
      setEditProfileError("Bạn chưa thay đổi thông tin nào.");
      return;
    }

    updateProfileMutation.mutate(payload);
  };

  const myReservationsError = myReservationsQuery.error
    ? getErrorMessage(myReservationsQuery.error, "Unable to load your reservations.")
    : null;
  const isReservationActionPending =
    reserveSlotMutation.isPending || cancelReservationMutation.isPending;

  const handleReserveSelectedSlot = () => {
    if (!selectedSpot) {
      toast.error("Select a slot first.");
      return;
    }
    if (selectedReservation) {
      toast.error("This slot is already reserved by you.");
      return;
    }
    if (selectedSpot.status !== "AVAILABLE") {
      toast.error("This slot is not available.");
      return;
    }
    if (!selectedReservationVehicle) {
      toast.error("Select a compatible vehicle first.");
      return;
    }

    const expectedArrival = parseExpectedArrival(expectedArrivalDate, expectedArrivalTime);
    if (!expectedArrival) {
      toast.error("Choose a valid expected arrival time.");
      return;
    }
    if (expectedArrival.getTime() <= Date.now()) {
      toast.error("Expected arrival must be in the future.");
      return;
    }

    reserveSlotMutation.mutate({
      vehicleId: selectedReservationVehicle._id,
      parkingSlotId: selectedSpot._id,
      expectedArrival: expectedArrival.toISOString(),
    });
  };

  const handleCancelReservationById = (reservationId: string) => {
    cancelReservationMutation.mutate(reservationId);
  };

  const handleQuickActionClick = (actionId: QuickAction["id"]) => {
    const nextAction = activeQuickAction === actionId ? null : actionId;
    setActiveQuickAction(nextAction);

    if (!nextAction) {
      return;
    }

    requestAnimationFrame(() => {
      if (nextAction === "my-reservations") {
        reservationSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      }
      reserveSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <DashboardMain wide>
        <DashboardSection>
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative">
                <div className="grid size-20 place-items-center rounded-full border border-border bg-secondary">
                  <UserRound className="size-10 text-muted-foreground" />
                </div>
                <span className="absolute bottom-1 right-1 size-3 rounded-full bg-status-empty ring-2 ring-card" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
                    {profile?.fullName ??
                      (profileQuery.isLoading ? "Loading profile..." : "Driver")}
                  </h1>
                  <span className="rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {profile
                      ? `${getProfileRoleName(profile)} · ${profile.status ?? "ACTIVE"}`
                      : "Driver active"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile?.email ?? "Profile email unavailable"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={isProfileOpen} onOpenChange={handleProfileOpenChange}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
                  >
                    <UserRound className="size-4" />
                    View profile
                  </button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border-border bg-card sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>My profile</DialogTitle>
                    <DialogDescription>Account details for the current driver.</DialogDescription>
                  </DialogHeader>

                  {profileQuery.isLoading ? (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background/45 px-3 py-3 text-sm text-muted-foreground">
                      <LoaderCircle className="size-4 animate-spin" />
                      Loading profile...
                    </div>
                  ) : profileError ? (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {profileError}
                    </div>
                  ) : profile ? (
                    <form className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="profile-full-name">Full name</Label>
                        <Input
                          id="profile-full-name"
                          value={profile.fullName}
                          className="h-11 rounded-xl"
                          readOnly
                        />
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="profile-email">Email</Label>
                          <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="profile-email"
                              value={profile.email}
                              className="h-11 rounded-xl pl-9"
                              readOnly
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="profile-phone">Phone</Label>
                          <div className="relative">
                            <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="profile-phone"
                              value={profile.phone}
                              className="h-11 rounded-xl pl-9"
                              readOnly
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label htmlFor="profile-role">Role</Label>
                          <Input
                            id="profile-role"
                            value={getProfileRoleName(profile)}
                            className="h-11 rounded-xl"
                            readOnly
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="profile-status">Status</Label>
                          <Input
                            id="profile-status"
                            value={profile.status}
                            className="h-11 rounded-xl"
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="profile-created-at">Created at</Label>
                        <Input
                          id="profile-created-at"
                          value={formatProfileDate(profile.createdAt)}
                          className="h-11 rounded-xl"
                          readOnly
                        />
                      </div>
                    </form>
                  ) : null}
                </DialogContent>
              </Dialog>

              <Dialog open={isEditProfileOpen} onOpenChange={handleEditProfileOpenChange}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    disabled={!profile}
                    className="h-[42px] rounded-xl px-4 text-sm font-semibold"
                  >
                    <Pencil className="size-4" />
                    Edit profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit profile</DialogTitle>
                    <DialogDescription>Cập nhật họ tên và số điện thoại của bạn.</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleEditProfileSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-profile-full-name">Họ tên</Label>
                      <Input
                        id="edit-profile-full-name"
                        value={editFullName}
                        onChange={(event) => setEditFullName(event.target.value)}
                        className="h-11 rounded-xl"
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="edit-profile-phone">Số điện thoại</Label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="edit-profile-phone"
                          value={editPhone}
                          onChange={(event) =>
                            setEditPhone(event.target.value.replace(/[^0-9]/g, ""))
                          }
                          className="h-11 rounded-xl pl-9"
                          inputMode="numeric"
                          autoComplete="tel"
                          maxLength={10}
                          required
                        />
                      </div>
                    </div>

                    {editProfileError ? (
                      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {editProfileError}
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="h-11 w-full rounded-xl text-[13px] font-semibold"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          Lưu thay đổi
                        </>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </DashboardSection>

        <DashboardSection ref={vehiclesSectionRef} compact>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <button
              type="button"
              onClick={() => setIsVehiclesExpanded((expanded) => !expanded)}
              className="flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left transition hover:opacity-90"
              aria-expanded={isVehiclesExpanded}
            >
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                  Xe của tôi
                </h2>
                <p className="text-sm text-muted-foreground">
                  {vehiclesQuery.isLoading
                    ? "Đang tải danh sách xe..."
                    : `${vehicles.length} xe đã đăng ký`}
                </p>
              </div>
              <ChevronDown
                className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${
                  isVehiclesExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Làm mới danh sách xe"
                onClick={() => void vehiclesQuery.refetch()}
                disabled={vehiclesQuery.isFetching}
                className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${vehiclesQuery.isFetching ? "animate-spin" : ""}`} />
              </button>

              <Dialog open={isVehicleFormOpen} onOpenChange={handleVehicleFormOpenChange}>
                <DialogTrigger asChild>
                  <Button type="button" variant="secondary" className="h-9 rounded-xl px-4 text-[13px] font-semibold">
                    <Plus className="size-4" />
                    Thêm xe
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Thêm xe mới</DialogTitle>
                    <DialogDescription>
                      Nhập biển số và loại xe để đăng ký vào tài khoản của bạn.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleVehicleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle-license-plate">License plate</Label>
                      <Input
                        id="vehicle-license-plate"
                        value={licensePlate}
                        onChange={(event) => setLicensePlate(event.target.value.toUpperCase())}
                        autoCapitalize="characters"
                        autoComplete="off"
                        inputMode="text"
                        placeholder="51A-12345"
                        className="h-11 rounded-xl font-mono tracking-wide"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="vehicle-type">Vehicle type</Label>
                      <Select
                        value={vehicleTypeId}
                        onValueChange={setVehicleTypeId}
                        disabled={isVehicleTypeLoading}
                      >
                        <SelectTrigger id="vehicle-type" className="h-11 rounded-xl">
                          <SelectValue
                            placeholder={isVehicleTypeLoading ? "Loading types..." : "Select type"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.map((type) => (
                            <SelectItem key={type._id} value={type._id}>
                              {type.type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {vehicleFormError || vehicleTypeError ? (
                      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {vehicleFormError ?? vehicleTypeError}
                      </div>
                    ) : null}

                    {vehicleTypes.length === 0 && !isVehicleTypeLoading ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void vehicleTypesQuery.refetch()}
                        className="h-10 w-full rounded-xl text-[13px] font-semibold"
                      >
                        <RefreshCw
                          className={`size-4 ${vehicleTypesQuery.isFetching ? "animate-spin" : ""}`}
                        />
                        Refresh vehicle types
                      </Button>
                    ) : null}

                    <Button
                      type="submit"
                      disabled={createVehicleMutation.isPending || isVehicleTypeLoading}
                      className="h-11 w-full rounded-xl text-[13px] font-semibold"
                    >
                      {createVehicleMutation.isPending ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <Plus className="size-4" />
                          Thêm xe
                        </>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Dialog open={isEditVehicleOpen} onOpenChange={handleEditVehicleOpenChange}>
            <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit vehicle</DialogTitle>
                <DialogDescription>Update the license plate or vehicle type.</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleEditVehicleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-vehicle-license-plate">License plate</Label>
                  <Input
                    id="edit-vehicle-license-plate"
                    value={editVehicleLicensePlate}
                    onChange={(event) =>
                      setEditVehicleLicensePlate(event.target.value.toUpperCase())
                    }
                    autoCapitalize="characters"
                    autoComplete="off"
                    inputMode="text"
                    placeholder="51A-12345"
                    className="h-11 rounded-xl font-mono tracking-wide"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-vehicle-type">Vehicle type</Label>
                  <Select
                    value={editVehicleTypeId}
                    onValueChange={setEditVehicleTypeId}
                    disabled={vehicleTypesQuery.isLoading && vehicleTypes.length === 0}
                  >
                    <SelectTrigger id="edit-vehicle-type" className="h-11 rounded-xl">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((type) => (
                        <SelectItem key={type._id} value={type._id}>
                          {type.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editVehicleError ? (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {editVehicleError}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={updateVehicleMutation.isPending}
                  className="h-11 w-full rounded-xl text-[13px] font-semibold"
                >
                  {updateVehicleMutation.isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Save changes
                    </>
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {isVehiclesExpanded ? (
            <div className="dashboard-panel mt-4 max-h-72 overflow-y-auto">
            {vehiclesQuery.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Đang tải xe của bạn...
              </div>
            ) : vehicleListError ? (
              <div className="p-4 text-sm text-destructive">{vehicleListError}</div>
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => {
                const isInactive = vehicle.status === "INACTIVE";
                return (
                <div
                  key={vehicle._id}
                  className={`flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-4 first:border-t-0 ${
                    isInactive ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background/65">
                      <CarFront className={`size-5 ${isInactive ? "text-muted-foreground" : "text-primary"}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold tracking-wide">
                        {vehicle.licensePlate}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {getVehicleTypeName(vehicle, vehicleTypes)} |{" "}
                        {formatRegisteredDate(vehicle.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isInactive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        <CircleDashed className="size-3.5" />
                        INACTIVE
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-status-empty/35 bg-status-empty/10 px-2.5 py-1 text-xs font-medium text-status-empty">
                          <CheckCircle2 className="size-3.5" />
                          {vehicle.monthlyCardId ? "Thẻ tháng" : "Đã đăng ký"}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleStartEditVehicle(vehicle)}
                          className="size-8 rounded-lg"
                          aria-label={`Sửa ${vehicle.licensePlate}`}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteVehicle(vehicle)}
                          disabled={deletingVehicleId === vehicle._id}
                          className="size-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Xóa ${vehicle.licensePlate}`}
                        >
                          {deletingVehicleId === vehicle._id ? (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
              })
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                Bạn chưa có xe nào. Bấm &quot;Thêm xe&quot; để đăng ký biển số.
              </div>
            )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Cuộn xuống hoặc bấm tiêu đề để xem danh sách xe.
            </p>
          )}
        </DashboardSection>

        <DashboardSection compact className="p-3">
          <div className="grid gap-2 md:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isActionHighlighted = action.id === activeQuickAction;
              return (
                <button
                  key={action.title}
                  type="button"
                  aria-pressed={isActionHighlighted}
                  onClick={() => handleQuickActionClick(action.id)}
                  className={`rounded-xl border px-4 py-4 text-left transition ${
                    isActionHighlighted
                      ? "border-primary/50 bg-primary/15 shadow-sm"
                      : "border-border bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight">{action.title}</h2>
                </button>
              );
            })}
          </div>
        </DashboardSection>

        {activeQuickAction === "my-reservations" ? (
          <DashboardSection ref={reservationSectionRef}>
            <DashboardSectionHeader
              kicker="My reservation"
              title="Reservation history"
              actions={
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void myReservationsQuery.refetch()}
                  disabled={myReservationsQuery.isFetching}
                  className="h-10 rounded-xl"
                >
                  <RefreshCw
                    className={`size-4 ${myReservationsQuery.isFetching ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              }
            />

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="reservation-history-date">Ngày</Label>
                <Input
                  id="reservation-history-date"
                  type="date"
                  value={reservationHistoryDate}
                  onChange={(event) => setReservationHistoryDate(event.target.value)}
                  className="h-10 w-full min-w-[180px] rounded-xl sm:w-auto"
                />
              </div>
              {reservationHistoryDate !== getLocalDateInputValue() ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReservationHistoryDate(getLocalDateInputValue())}
                  className="h-10 rounded-xl"
                >
                  Hôm nay
                </Button>
              ) : null}
            </div>

            {myReservationsQuery.isLoading ? (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading reservations...
              </div>
            ) : myReservationsError ? (
              <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {myReservationsError}
              </div>
            ) : filteredHistoryReservations.length > 0 ? (
              <div className="mt-4 space-y-3">
                {filteredHistoryReservations.map((reservation) => {
                  const reservationSlotId = getReservationSlotId(reservation);
                  const isPending = reservation.status === "PENDING";
                  return (
                    <div
                      key={reservation._id}
                      className="rounded-xl border border-border bg-secondary p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-mono text-sm font-semibold">
                            {getReservationSlotLabel(reservation)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Vehicle: {getReservationVehicleLabel(reservation) ?? "N/A"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getReservationStatusBadge(reservation.status)}`}
                        >
                          {reservation.status}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>
                          Arrival:{" "}
                          {reservation.expectedArrival
                            ? formatDateTime(reservation.expectedArrival)
                            : "N/A"}
                        </p>
                        <p>
                          Expiry:{" "}
                          {reservation.expiryAt ? formatDateTime(reservation.expiryAt) : "N/A"}
                        </p>
                      </div>

                      {isPending ? (
                        <div className="mt-3">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleCancelReservationById(reservation._id)}
                            disabled={cancelReservationMutation.isPending}
                            className="h-9 rounded-xl text-sm font-medium"
                          >
                            {cancelReservationMutation.isPending ? (
                              <>
                                <LoaderCircle className="size-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete reservation"
                            )}
                          </Button>
                        </div>
                      ) : null}

                      {reservationSlotId && reservationBySlotId.has(reservationSlotId) ? (
                        <p className="mt-2 text-xs text-status-yours">
                          This slot is currently locked for you.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <DashboardEmptyState className="mt-4 text-left">
                No reservations on {formatReservationHistoryDateLabel(reservationHistoryDate)}.
              </DashboardEmptyState>
            )}
          </DashboardSection>
        ) : null}

        {activeQuickAction === "reserve" ? (
          <div ref={reserveSectionRef} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <DashboardSection>
              <DashboardSectionHeader
                kicker="View parking information"
                title={selectedFloor?.floorName ?? "Floor layout"}
                actions={
                  <>
                    <DashboardLegend label={`Available ${availableCount}`} tone="bg-status-empty" />
                    <DashboardLegend label={`Reserved ${reservedCount}`} tone="bg-status-reserved" />
                    <DashboardLegend label={`Unavailable ${unavailableCount}`} tone="bg-status-maintenance" />
                    <DashboardLegend label={`In used ${inUsedCount}`} tone="bg-status-full" />
                  </>
                }
              />

              <div className="mt-4 grid gap-3 sm:grid-cols-[240px_auto]">
                <div className="space-y-2">
                  <Label htmlFor="driver-floor-filter">Floor</Label>
                  <Select value={selectedFloorId} onValueChange={setSelectedFloorId}>
                    <SelectTrigger id="driver-floor-filter" className="h-10 rounded-xl">
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
                    const isAvailable = slot.status === "AVAILABLE";
                    const isReserved = slot.status === "RESERVED";
                    const isReservedByMe = reservationBySlotId.has(slot._id);
                    const isSelectable = isAvailable || isReservedByMe;
                    const isSelected = selectedSpotId === slot._id;
                    const slotLabel = isReservedByMe
                      ? "Reserved by you"
                      : slotStatusText[slot.status];
                    const slotStyle = isReservedByMe
                      ? reservedByYouButtonStyle
                      : slotButtonStyles[slot.status];
                    const statusLabel = isReservedByMe
                      ? "Yours"
                      : isReserved
                        ? "Reserved"
                        : null;
                    return (
                      <button
                        key={slot._id}
                        type="button"
                        disabled={!isSelectable}
                        onClick={() => setSelectedSpotId(slot._id)}
                        className={`relative flex h-11 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-1 text-center text-sm font-semibold transition ${slotStyle} ${
                          isSelected ? "border-primary ring-2 ring-inset ring-primary/70" : ""
                        } ${isSelectable ? "cursor-pointer" : ""}`}
                        aria-label={`${slot.slotNumber} (${slotLabel})`}
                      >
                        <span className="font-mono text-[11px] leading-none">{slot.slotNumber}</span>
                        <span
                          className={`min-h-[10px] font-mono text-[8px] uppercase leading-none tracking-[0.1em] ${
                            statusLabel ? "opacity-100" : "opacity-0"
                          }`}
                          aria-hidden={!statusLabel}
                        >
                          {statusLabel ?? "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <DashboardEmptyState className="mt-4 text-left">
                  No slots found for this floor.
                </DashboardEmptyState>
              )}
            </DashboardSection>

            <DashboardSection compact>
              {selectedSpot ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold tracking-tight">
                        {selectedSpot.slotNumber}
                      </h4>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          selectedReservation
                            ? reservedByYouBadgeStyle
                            : slotStatusBadge[selectedSpot.status]
                        }`}
                      >
                        {selectedReservation
                          ? "Reserved by you"
                          : slotStatusText[selectedSpot.status]}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <p className="inline-flex items-center gap-2">
                        <CircleDashed className="size-4" />
                        {selectedFloor?.floorName ?? "Floor"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-secondary p-4">
                    <p className="dashboard-kicker">Reserve parking slot</p>
                    {myReservationsError ? (
                      <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {myReservationsError}
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="driver-reserve-vehicle">Vehicle</Label>
                        <Select
                          value={selectedReservationVehicleId}
                          onValueChange={setSelectedReservationVehicleId}
                          disabled={compatibleVehicles.length === 0 || Boolean(selectedReservation)}
                        >
                          <SelectTrigger id="driver-reserve-vehicle" className="h-10 rounded-xl">
                            <SelectValue placeholder="Select your vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {compatibleVehicles.map((vehicle) => (
                              <SelectItem key={vehicle._id} value={vehicle._id}>
                                {vehicle.licensePlate} · {getVehicleTypeName(vehicle, vehicleTypes)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="driver-expected-arrival-date">Ngày đến</Label>
                          <Input
                            id="driver-expected-arrival-date"
                            type="date"
                            value={expectedArrivalDate}
                            onChange={(event) => setExpectedArrivalDate(event.target.value)}
                            min={getLocalDateInputValue()}
                            disabled={Boolean(selectedReservation)}
                            className="h-10 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="driver-expected-arrival-time">Giờ đến</Label>
                          <Input
                            id="driver-expected-arrival-time"
                            type="time"
                            value={expectedArrivalTime}
                            onChange={(event) => setExpectedArrivalTime(event.target.value)}
                            min={minExpectedArrivalTime}
                            disabled={Boolean(selectedReservation)}
                            className="h-10 rounded-xl"
                          />
                        </div>
                      </div>

                      {selectedReservation ? (
                        <div className="rounded-xl border border-status-yours/45 bg-status-yours/10 px-3 py-2 text-sm">
                          <p className="font-medium text-status-yours">Current reservation</p>
                          <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                            <p>
                              Vehicle: {getReservationVehicleLabel(selectedReservation) ?? "N/A"}
                            </p>
                            <p>
                              Arrival:{" "}
                              {selectedReservation.expectedArrival
                                ? formatDateTime(selectedReservation.expectedArrival)
                                : "N/A"}
                            </p>
                            <p>
                              Expiry:{" "}
                              {selectedReservation.expiryAt
                                ? formatDateTime(selectedReservation.expiryAt)
                                : "N/A"}
                            </p>
                            <p className="text-status-yours/80">
                              To cancel, go to My reservation.
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-2">
                        <Button
                          type="button"
                          onClick={handleReserveSelectedSlot}
                          disabled={
                            isReservationActionPending ||
                            selectedSpot.status !== "AVAILABLE" ||
                            Boolean(selectedReservation) ||
                            !selectedReservationVehicle
                          }
                          className="h-10 rounded-xl text-sm font-semibold"
                        >
                          {reserveSlotMutation.isPending ? (
                            <>
                              <LoaderCircle className="size-4 animate-spin" />
                              Reserving...
                            </>
                          ) : (
                            <>
                              <MapPin className="size-4" />
                              Reserve this slot
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <DashboardEmptyState>
                  <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border border-border bg-card">
                    <MapPin className="size-6 text-muted-foreground" />
                  </div>
                  <h4 className="text-lg font-semibold text-foreground">No spot selected</h4>
                  <p className="mt-2">Click an available slot to create a reservation.</p>
                </DashboardEmptyState>
              )}
            </DashboardSection>
          </div>
        ) : null}
      </DashboardMain>
    </div>
  );
}

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function reservationMatchesDateFilter(reservation: Reservation, dateKey: string) {
  const source = reservation.expectedArrival ?? reservation.reservedAt;
  if (!source) {
    return false;
  }
  return getLocalDateInputValue(new Date(source)) === dateKey;
}

function formatReservationHistoryDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) {
    return dateKey;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function parseExpectedArrival(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const date = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDefaultExpectedArrivalDate() {
  return getLocalDateInputValue(new Date(Date.now() + 60 * 60_000));
}

function getDefaultExpectedArrivalTime() {
  return toLocalTimeInputValue(Date.now() + 60 * 60_000);
}

function toLocalTimeInputValue(timestamp: number) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getReservationVehicleLabel(reservation: Reservation) {
  if (typeof reservation.vehicleId === "object") {
    return reservation.vehicleId.licensePlate ?? reservation.vehicleId._id;
  }
  return reservation.vehicleId;
}

function getReservationSlotLabel(reservation: Reservation) {
  if (typeof reservation.parkingSlotId === "object") {
    return reservation.parkingSlotId.slotNumber ?? reservation.parkingSlotId._id;
  }
  return reservation.parkingSlotId;
}

function getReservationStatusBadge(status: Reservation["status"]) {
  switch (status) {
    case "PENDING":
      return reservedByYouBadgeStyle;
    case "CLAIMED":
      return "border-status-empty/45 bg-status-empty/15 text-status-empty";
    case "CANCELLED":
      return "border-border bg-muted text-muted-foreground";
    case "EXPIRED":
      return "border-status-full/45 bg-status-full/15 text-status-full";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function getVehicleTypeName(vehicle: Vehicle, vehicleTypes: VehicleType[]) {
  if (typeof vehicle.vehicleTypeId === "object" && vehicle.vehicleTypeId?.type) {
    return vehicle.vehicleTypeId.type;
  }

  const matchedType = vehicleTypes.find((type) => type._id === vehicle.vehicleTypeId);
  return matchedType?.type ?? "Vehicle";
}

function getVehicleTypeId(vehicle: Vehicle): string | null {
  if (typeof vehicle.vehicleTypeId === "object" && vehicle.vehicleTypeId?._id) {
    return vehicle.vehicleTypeId._id;
  }
  if (typeof vehicle.vehicleTypeId === "string") {
    return vehicle.vehicleTypeId;
  }
  return null;
}

function getProfileRoleName(profile: UserProfile) {
  if (typeof profile.roleId === "object" && profile.roleId?.roleName) {
    return profile.roleId.roleName;
  }

  return "CUSTOMER";
}

function formatProfileDate(value?: string) {
  return formatRegisteredDate(value);
}

function formatRegisteredDate(value?: string) {
  if (!value) {
    return "Registered";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Registered";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
