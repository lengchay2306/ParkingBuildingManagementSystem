import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  CarFront,
  CheckCircle2,
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
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
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
  getVehicleByLicensePlate,
  getMyVehicles,
  getVehicleTypes,
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
  description: string;
  cta: string;
  icon: LucideIcon;
  highlighted?: boolean;
};

const quickActions: QuickAction[] = [
  {
    id: "reserve",
    title: "Reserve Parking Slot",
    description: "Book in advance when reservation is supported at this facility.",
    cta: "Open reservation",
    icon: MapPin,
    highlighted: true,
  },
  {
    id: "my-reservations",
    title: "My Reservations",
    description: "Review reservations and cancel pending reservations quickly.",
    cta: "Open reservations",
    icon: Clock3,
  },
];

const slotStatusText: Record<ParkingSlotStatus, string> = {
  AVAILABLE: "Available",
  UNAVAILABLE: "Unavailable",
  "CURRENTLY-IN-USED": "Currently in used",
};

const slotStatusBadge: Record<ParkingSlotStatus, string> = {
  AVAILABLE: "bg-status-empty/20 text-status-empty border-status-empty/40",
  UNAVAILABLE: "bg-muted text-muted-foreground border-border",
  "CURRENTLY-IN-USED": "bg-status-full/20 text-status-full border-status-full/45",
};

const slotButtonStyles: Record<ParkingSlotStatus, string> = {
  AVAILABLE:
    "border-status-empty/40 bg-status-empty/10 text-status-empty hover:border-status-empty/70 hover:-translate-y-0.5",
  UNAVAILABLE: "cursor-not-allowed border-border bg-background/55 text-muted-foreground opacity-80",
  "CURRENTLY-IN-USED":
    "cursor-not-allowed border-status-full/40 bg-status-full/12 text-status-full opacity-80",
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
  const [activeQuickAction, setActiveQuickAction] = useState<QuickAction["id"]>("reserve");
  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [isVehicleFormOpen, setIsVehicleFormOpen] = useState(false);
  const [lookupPlate, setLookupPlate] = useState("");
  const [lookupVehicle, setLookupVehicle] = useState<Vehicle | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
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
  const reserveSectionRef = useRef<HTMLElement | null>(null);
  const reservationSectionRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const profileQuery = useQuery({
    queryKey: myProfileQueryKey,
    queryFn: getMyProfile,
    enabled: hasMounted,
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
      setLookupVehicle((previous) =>
        previous?._id === updatedVehicle._id ? updatedVehicle : previous,
      );
      toast.success("Vehicle updated", {
        description: `${updatedVehicle.licensePlate} has been updated.`,
      });
      await queryClient.invalidateQueries({ queryKey: myVehiclesQueryKey });
    },
    onError: (error) => {
      setEditVehicleError(getErrorMessage(error, "Unable to update vehicle."));
    },
  });
  const lookupVehicleMutation = useMutation({
    mutationFn: getVehicleByLicensePlate,
    onSuccess: (vehicle) => {
      setLookupVehicle(vehicle);
      setLookupError(null);
    },
    onError: (error) => {
      setLookupVehicle(null);
      setLookupError(getErrorMessage(error, "Vehicle not found."));
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
      setEditProfileError(getErrorMessage(error, "Không thể cập nhật hồ sơ."));
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
  const reservations = myReservationsQuery.data ?? emptyReservations;
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
      vehicles.filter((vehicle) => {
        const typeId = getVehicleTypeId(vehicle);
        if (!selectedFloorVehicleTypeId) {
          return Boolean(typeId);
        }
        return typeId === selectedFloorVehicleTypeId;
      }),
    [selectedFloorVehicleTypeId, vehicles],
  );
  const selectedReservationVehicle = compatibleVehicles.find(
    (vehicle) => vehicle._id === selectedReservationVehicleId,
  );
  const profile = profileQuery.data ?? null;
  const primaryVehicle = vehicles[0] ?? null;
  const primaryVehicleType = primaryVehicle
    ? getVehicleTypeName(primaryVehicle, vehicleTypes)
    : null;

  const availableCount = floorSlots.filter((slot) => slot.status === "AVAILABLE").length;
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

  const handleVehicleLookupSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLookupError(null);

    const normalizedPlate = lookupPlate.trim().replace(/\s+/g, " ").toUpperCase();
    if (normalizedPlate.length < 4) {
      setLookupVehicle(null);
      setLookupError("Enter a valid license plate to search.");
      return;
    }

    setLookupPlate(normalizedPlate);
    lookupVehicleMutation.mutate(normalizedPlate);
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
  const selectedFloorVehicleType =
    selectedFloor?.vehicleType?.type ??
    (selectedFloorVehicleTypeId
      ? (vehicleTypes.find((type) => type._id === selectedFloorVehicleTypeId)?.type ??
        "Unknown type")
      : null);

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

    reserveSlotMutation.mutate({
      vehicleId: selectedReservationVehicle._id,
      parkingSlotId: selectedSpot._id,
      expectedArrival: buildExpectedArrivalIso(60),
    });
  };

  const handleCancelSelectedReservation = () => {
    if (!selectedReservation) {
      toast.error("No reservation found for this slot.");
      return;
    }

    cancelReservationMutation.mutate(selectedReservation._id);
  };

  const handleCancelReservationById = (reservationId: string) => {
    cancelReservationMutation.mutate(reservationId);
  };

  const handleQuickActionClick = (actionId: QuickAction["id"]) => {
    setActiveQuickAction(actionId);
    requestAnimationFrame(() => {
      if (actionId === "my-reservations") {
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
      <main className="mx-auto w-full max-w-[1320px] px-4 pb-12 pt-6 md:px-6">
        <section className="rounded-3xl border border-border/75 bg-card/75 p-5 shadow-soft md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative">
                <div className="grid size-20 place-items-center rounded-full border border-border bg-background/80">
                  <UserRound className="size-10 text-muted-foreground" />
                </div>
                <span className="absolute bottom-1 right-1 size-3 rounded-full bg-status-empty ring-2 ring-background" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {profile?.fullName ??
                      (profileQuery.isLoading ? "Loading profile..." : "Driver")}
                  </h1>
                  <span className="rounded-md border border-primary/40 bg-primary/12 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-primary">
                    {profile ? `${getProfileRoleName(profile)} active` : "Driver active"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {profile?.email ?? "Profile email unavailable"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CarFront className="size-4" />
                    {primaryVehicle ? `${primaryVehicleType} Standard` : "No registered vehicle"}
                  </span>
                  <span className="text-border">|</span>
                  <span className="font-mono tracking-wide">
                    Plate: {primaryVehicle?.licensePlate ?? "Not registered"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Dialog open={isProfileOpen} onOpenChange={handleProfileOpenChange}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <InfoStat
              label="Available spots"
              value={`${availableCount}`}
              tone="text-status-empty"
            />
            <InfoStat
              label="Unavailable spots"
              value={`${unavailableCount}`}
              tone="text-foreground"
            />
            <InfoStat label="In-used spots" value={`${inUsedCount}`} tone="text-primary" />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border/75 bg-card/70 p-5 shadow-soft md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Vehicle registry
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">My registered vehicles</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label="Refresh registered vehicles"
                onClick={() => void vehiclesQuery.refetch()}
                disabled={vehiclesQuery.isFetching}
                className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-background/55 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`size-4 ${vehiclesQuery.isFetching ? "animate-spin" : ""}`} />
              </button>

              <Dialog open={isVehicleFormOpen} onOpenChange={handleVehicleFormOpenChange}>
                <DialogTrigger asChild>
                  <Button type="button" className="h-9 rounded-xl px-4 text-[13px] font-semibold">
                    <Plus className="size-4" />
                    Register vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Register vehicle</DialogTitle>
                    <DialogDescription>
                      Add a license plate and vehicle type to your account.
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
                          Register vehicle
                        </>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <form
            onSubmit={handleVehicleLookupSubmit}
            className="mt-5 grid gap-3 rounded-2xl border border-border bg-background/35 p-3 md:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <Label htmlFor="vehicle-lookup-plate" className="sr-only">
                Search vehicle by license plate
              </Label>
              <Input
                id="vehicle-lookup-plate"
                value={lookupPlate}
                onChange={(event) => setLookupPlate(event.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="Search license plate"
                className="h-10 rounded-xl font-mono tracking-wide"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={lookupVehicleMutation.isPending}
              className="h-10 rounded-xl px-4 text-[13px] font-semibold"
            >
              {lookupVehicleMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              Search
            </Button>
          </form>

          {lookupError ? (
            <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {lookupError}
            </div>
          ) : null}

          {lookupVehicle ? (
            <div className="mt-3 rounded-2xl border border-primary/35 bg-primary/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/35 bg-background/65">
                    <Search className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-semibold tracking-wide">
                      {lookupVehicle.licensePlate}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {getVehicleTypeName(lookupVehicle, vehicleTypes)} |{" "}
                      {formatRegisteredDate(lookupVehicle.createdAt)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-background/45 px-2.5 py-1 text-xs font-medium text-primary">
                  Lookup result
                </span>
              </div>
            </div>
          ) : null}

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

          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-background/35">
            {vehiclesQuery.isLoading ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading registered vehicles...
              </div>
            ) : vehicleListError ? (
              <div className="p-4 text-sm text-destructive">{vehicleListError}</div>
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <div
                  key={vehicle._id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-4 first:border-t-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background/65">
                      <CarFront className="size-5 text-primary" />
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
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-status-empty/35 bg-status-empty/10 px-2.5 py-1 text-xs font-medium text-status-empty">
                      <CheckCircle2 className="size-3.5" />
                      {vehicle.monthlyCardId ? "Monthly card" : "Registered"}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStartEditVehicle(vehicle)}
                      className="size-8 rounded-lg"
                      aria-label={`Edit ${vehicle.licensePlate}`}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-muted-foreground">No vehicles registered yet.</div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border/70 bg-card/65 p-2 shadow-soft">
          <div className="grid gap-2 md:grid-cols-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isActionHighlighted = action.id === activeQuickAction;
              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => handleQuickActionClick(action.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    isActionHighlighted
                      ? "border-primary/45 bg-primary/10"
                      : "border-border bg-background/35 hover:bg-background/60"
                  }`}
                >
                  <div className="mb-3 inline-flex size-8 items-center justify-center rounded-lg border border-border bg-background/65">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold tracking-tight">{action.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {action.description}
                  </p>
                  <span className="mt-3 inline-block text-xs font-medium text-primary">
                    {action.cta}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {activeQuickAction === "my-reservations" ? (
          <section
            ref={reservationSectionRef}
            className="mt-6 rounded-3xl border border-border/75 bg-card/70 p-5 shadow-soft md:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  My reservation
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">Reservation history</h3>
              </div>
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
            ) : reservations.length > 0 ? (
              <div className="mt-4 space-y-3">
                {reservations.map((reservation) => {
                  const reservationSlotId = getReservationSlotId(reservation);
                  const isPending = reservation.status === "PENDING";
                  return (
                    <div
                      key={reservation._id}
                      className="rounded-2xl border border-border bg-background/45 p-4"
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
                        <p className="mt-2 text-xs text-status-reserved">
                          This slot is currently locked for you.
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/35 px-4 py-3 text-sm text-muted-foreground">
                You have no reservations yet.
              </div>
            )}
          </section>
        ) : null}

        {activeQuickAction === "reserve" ? (
          <section
            ref={reserveSectionRef}
            className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
          >
            <div className="rounded-3xl border border-border/75 bg-card/70 p-5 shadow-soft md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    View parking information
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                    {selectedFloor?.floorName ?? "Floor layout"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose an available slot to reserve. Supported reservations are held for up to
                    15 minutes.
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
                    const isReservedByMe = reservationBySlotId.has(slot._id);
                    const isSelectable = isAvailable || isReservedByMe;
                    const isSelected = selectedSpotId === slot._id;
                    const slotLabel = isReservedByMe
                      ? "Reserved by you"
                      : slotStatusText[slot.status];
                    return (
                      <button
                        key={slot._id}
                        type="button"
                        disabled={!isSelectable}
                        onClick={() => setSelectedSpotId(slot._id)}
                        className={`relative rounded-lg border p-2 text-left text-xs font-medium transition ${
                          isReservedByMe
                            ? "border-status-reserved/45 bg-status-reserved/12 text-status-reserved"
                            : slotButtonStyles[slot.status]
                        } ${isSelected ? "ring-2 ring-foreground" : "ring-1 ring-transparent"} ${
                          isSelectable ? "cursor-pointer" : "cursor-not-allowed"
                        }`}
                        aria-label={`${slot.slotNumber} (${slotLabel})`}
                      >
                        <span className="font-mono text-[11px]">{slot.slotNumber}</span>
                        {isReservedByMe ? (
                          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em]">
                            Reserved
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-border bg-background/35 px-4 py-3 text-sm text-muted-foreground">
                  No slots found for this floor.
                </div>
              )}
            </div>

            <aside className="rounded-3xl border border-border/75 bg-card/70 p-5 shadow-soft">
              {selectedSpot ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-background/40 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold tracking-tight">
                        {selectedSpot.slotNumber}
                      </h4>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          selectedReservation
                            ? "border-status-reserved/45 bg-status-reserved/15 text-status-reserved"
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
                      <p className="inline-flex items-center gap-2">
                        <Clock3 className="size-4" />
                        Hold limit: 15 minutes
                      </p>
                      <p className="inline-flex items-center gap-2">
                        <ShieldCheck className="size-4" />
                        Camera monitored 24/7
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/40 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      Reserve parking slot
                    </p>
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
                        <p className="text-xs text-muted-foreground">
                          {selectedFloorVehicleType
                            ? `Only ${selectedFloorVehicleType} vehicles can reserve this floor.`
                            : "Vehicle type is validated by backend."}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Expected arrival</span>
                          <span className="font-semibold">{formatFutureTime(60)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Arrival and expiry times are finalized by backend.
                        </p>
                      </div>

                      {selectedReservation ? (
                        <div className="rounded-xl border border-status-reserved/45 bg-status-reserved/10 px-3 py-2 text-sm">
                          <p className="font-medium text-status-reserved">Current reservation</p>
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

                        {selectedReservation ? (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCancelSelectedReservation}
                            disabled={isReservationActionPending}
                            className="h-10 rounded-xl text-sm font-medium"
                          >
                            {cancelReservationMutation.isPending ? (
                              <>
                                <LoaderCircle className="size-4 animate-spin" />
                                Cancelling...
                              </>
                            ) : (
                              "Cancel reservation"
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid h-full place-items-center rounded-2xl border border-dashed border-border bg-background/35 p-6 text-center">
                  <div>
                    <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full border border-border bg-background">
                      <MapPin className="size-6 text-muted-foreground" />
                    </div>
                    <h4 className="text-xl font-semibold tracking-tight">No spot selected</h4>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Click an available slot to create or cancel a reservation.
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function buildExpectedArrivalIso(minutesFromNow: number) {
  return new Date(Date.now() + minutesFromNow * 60_000).toISOString();
}

function formatFutureTime(minutesFromNow: number) {
  return formatDateTime(buildExpectedArrivalIso(minutesFromNow));
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
      return "border-status-reserved/45 bg-status-reserved/15 text-status-reserved";
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

function Legend({ label, tone }: { label: string; tone: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
      <span className={`size-2 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function InfoStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-xl font-semibold tracking-tight ${tone}`}>{value}</p>
    </div>
  );
}
